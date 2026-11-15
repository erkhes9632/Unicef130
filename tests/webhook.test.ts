/**
 * Clerk webhook (POST /api/webhooks/clerk): the Svix signature is verified with the real Clerk
 * helper (signatures are made here the same way Svix makes them); valid events reach D1.
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const upserts: unknown[] = [];
const removed: string[] = [];
mock.module("@/db", () => ({ getDb: async () => ({}) }));
mock.module("@/lib/users/sync", () => ({
  mirrorFromClerk: (u: { id?: string }) => (u?.id ? { id: u.id } : null),
  upsertUser: async (_db: unknown, m: unknown) => void upserts.push(m),
}));
mock.module("@/lib/users/delete", () => ({
  removeUserData: async (_db: unknown, id: string) => void removed.push(id),
}));

const SECRET_BYTES = Buffer.from("test-webhook-secret-32-bytes!!!!");
const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;
const previous = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
process.env.CLERK_WEBHOOK_SIGNING_SECRET = SECRET;
afterAll(() => {
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = previous;
});

const { POST } = await import("@/app/api/webhooks/clerk/route");

function signed(body: string, { secret = SECRET_BYTES, at = Math.floor(Date.now() / 1000) } = {}) {
  const id = `msg_${crypto.randomUUID()}`;
  const signature = createHmac("sha256", secret).update(`${id}.${at}.${body}`).digest("base64");
  return new Request("https://club.test/api/webhooks/clerk", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(at),
      "svix-signature": `v1,${signature}`,
    },
  });
}
// The route takes a NextRequest; a plain Request carries everything it reads.
const post = (r: Request) => POST(r as Parameters<typeof POST>[0]);

beforeEach(() => {
  upserts.length = 0;
  removed.length = 0;
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = SECRET;
});

describe("Clerk webhook", () => {
  test("user.created / user.updated → D1 upsert", async () => {
    for (const type of ["user.created", "user.updated"]) {
      const res = await post(signed(JSON.stringify({ type, data: { id: "user_1" } })));
      expect(res.status).toBe(200);
    }
    expect(upserts).toEqual([{ id: "user_1" }, { id: "user_1" }]);
  });

  test("user.deleted → personal data removed", async () => {
    const res = await post(
      signed(JSON.stringify({ type: "user.deleted", data: { id: "user_9", deleted: true } })),
    );
    expect(res.status).toBe(200);
    expect(removed).toEqual(["user_9"]);
  });

  test("other events are acknowledged and ignored", async () => {
    const res = await post(signed(JSON.stringify({ type: "session.created", data: { id: "s" } })));
    expect(await res.json()).toEqual({ ok: true, result: "ignored" });
    expect(upserts).toEqual([]);
  });

  test("wrong secret, tampered body, missing headers or an old timestamp → 400, no writes", async () => {
    const body = JSON.stringify({ type: "user.deleted", data: { id: "user_1" } });
    expect((await post(signed(body, { secret: Buffer.from("wrong-secret") }))).status).toBe(400);

    const tampered = signed(body);
    const forged = new Request(tampered.url, {
      method: "POST",
      headers: tampered.headers,
      body: body.replace("user_1", "user_2"),
    });
    expect((await post(forged)).status).toBe(400);

    expect(
      (await post(new Request("https://club.test/api/webhooks/clerk", { method: "POST", body })))
        .status,
    ).toBe(400);
    expect((await post(signed(body, { at: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(
      400,
    );
    expect(removed).toEqual([]);
  });

  test("not configured → 503", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const res = await post(signed(JSON.stringify({ type: "user.created", data: { id: "x" } })));
    expect(res.status).toBe(503);
    expect(upserts).toEqual([]);
  });
});
