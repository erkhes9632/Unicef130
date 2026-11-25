import { describe, expect, test } from "bun:test";
import { finishEvenIfCancelled } from "@/lib/finish-request";

const context = () => {
  const work: Promise<unknown>[] = [];
  return { work, ctx: { waitUntil: (p: Promise<unknown>) => void work.push(p) } };
};

/** A body that produces `parts` chunks, recording how far it got. */
function body(parts: number, seen: { chunks: number }) {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await Bun.sleep(1);
      if (seen.chunks === parts) return controller.close();
      seen.chunks++;
      controller.enqueue(new TextEncoder().encode(`part${seen.chunks};`));
    },
  });
}

describe("finishEvenIfCancelled", () => {
  test("the client gets the same response", async () => {
    const { ctx, work } = context();
    const seen = { chunks: 0 };
    const original = new Response(body(3, seen), { status: 201, headers: { "x-a": "1" } });
    const response = await finishEvenIfCancelled(ctx, Promise.resolve(original));
    expect(response.status).toBe(201);
    expect(response.headers.get("x-a")).toBe("1");
    expect(await response.text()).toBe("part1;part2;part3;");
    await Promise.all(work);
    expect(work.length).toBe(2);
  });

  test("the body is read to the end even if the client goes away", async () => {
    const { ctx, work } = context();
    const seen = { chunks: 0 };
    const response = await finishEvenIfCancelled(ctx, Promise.resolve(new Response(body(5, seen))));
    await response.body!.cancel();
    await Promise.all(work);
    expect(seen.chunks).toBe(5);
  });

  test("responses without a body and failed renders are passed through", async () => {
    const { ctx, work } = context();
    const redirect = await finishEvenIfCancelled(
      ctx,
      Promise.resolve(new Response(null, { status: 307, headers: { location: "/sign-in" } })),
    );
    expect(redirect.status).toBe(307);
    const failed = finishEvenIfCancelled(ctx, Promise.reject(new Error("render failed")));
    await expect(failed).rejects.toThrow("render failed");
    await Promise.all(work);
  });
});
