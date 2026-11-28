/**
 * Admin API routes, called without the right role: refused with 401/403/404 before any
 * database, Clerk, R2 or cache work. The Clerk webhook refuses unsigned requests.
 */
import { join } from "node:path";
import { beforeEach, describe, expect, mock, test } from "bun:test";

type Role = "admin" | "member" | null;
let me: { id: string; email: string; name: string; role: Role; applyBlocked: boolean } | null =
  null;
class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
  }
}
const refuse = (need: "admin" | "member" | "signed-in") => {
  if (!me) throw new AuthError("unauthenticated");
  if (need === "admin" && me.role !== "admin") throw new AuthError("forbidden");
  if (need === "member" && !me.role) throw new AuthError("forbidden");
  return me;
};
const effects: string[] = [];
const record =
  (name: string) =>
  (...args: unknown[]) => {
    effects.push(`${name}(${args.length})`);
    return chain();
  };
/** Any use of the database is recorded; the chain is awaitable so code doesn't crash. */
function chain(root = false): unknown {
  return new Proxy(() => {}, {
    get(_t, prop) {
      if (prop === "then") return root ? undefined : (resolve: (v: unknown) => void) => resolve([]);
      return (...args: unknown[]) => {
        effects.push(`db.${String(prop)}`);
        void args;
        return chain();
      };
    },
  });
}
mock.module("@/lib/auth/session", () => ({
  AuthError,
  getCurrentUser: async () => me,
  getFreshUser: async () => me,
  refreshUserFromClerk: async () => null,
  requireAdmin: async () => refuse("admin"),
  requireMember: async () => refuse("member"),
  assertAdmin: async () => refuse("admin"),
  assertMember: async () => refuse("member"),
  assertSignedIn: async () => refuse("signed-in"),
}));
mock.module("@/db", () => ({
  getDb: async () => {
    effects.push("getDb");
    return chain(true);
  },
  createDb: () => chain(true),
}));
mock.module("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    effects.push("cloudflare-context");
    return { env: {}, ctx: { waitUntil() {} } };
  },
}));
mock.module("next/cache", () => ({
  revalidatePath: record("revalidatePath"),
  revalidateTag: record("revalidateTag"),
  updateTag: record("updateTag"),
  refresh: record("refresh"),
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
mock.module("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
}));
mock.module("@/lib/users/clerk-admin", () => ({
  setRole: record("clerk.setRole"),
  setBanned: record("clerk.setBanned"),
  deleteClerkUser: record("clerk.delete"),
  countActiveAdmins: async () => 2,
}));
mock.module("@/lib/media/server", () => ({
  deleteMediaUrls: record("media.delete"),
  isOwnMediaUrl: () => true,
  storeImage: record("media.store"),
  UploadError: class UploadError extends Error {},
}));
mock.module("@/lib/admin/revalidate", () => ({
  revalidatePublic: record("revalidatePublic"),
  revalidatePublicItem: record("revalidatePublicItem"),
  refreshPublicPages: record("refreshPublicPages"),
}));
mock.module("@/lib/rate-limit", () => ({
  consumeRateLimit: async () => {
    effects.push("rate-limit");
    return { allowed: true, count: 1, retryAfterSec: 0 };
  },
}));
mock.module("@/lib/applications/sheets-sync", () => ({
  syncApplicationToSheets: record("sheets"),
  runInBackground: async () => {},
  isSheetsConfigured: async () => false,
}));

const ADMIN_ROUTES: { file: string; method: "GET" | "POST"; path: string }[] = [
  { file: "src/app/api/admin/stats/route.ts", method: "GET", path: "/api/admin/stats" },
  { file: "src/app/api/admin/upload/route.ts", method: "POST", path: "/api/admin/upload" },
  {
    file: "src/app/admin/(panel)/applications/export/route.ts",
    method: "GET",
    path: "/admin/applications/export",
  },
  {
    file: "src/app/admin/(panel)/hours/export/route.ts",
    method: "GET",
    path: "/admin/hours/export?year=2025-2026",
  },
];

beforeEach(() => {
  me = null;
  effects.length = 0;
});

describe("admin API routes refuse callers without the admin role", () => {
  for (const route of ADMIN_ROUTES)
    test(`${route.method} ${route.path}`, async () => {
      const mod = (await import(join(process.cwd(), route.file))) as Record<
        string,
        (req: Request) => Promise<Response>
      >;
      for (const role of ["signed-out", null, "member"] as const) {
        me =
          role === "signed-out"
            ? null
            : { id: "u1", email: "u1@x.mn", name: "U", role, applyBlocked: false };
        effects.length = 0;
        const req = new Request(`https://site.test${route.path}`, {
          method: route.method,
          headers: { origin: "https://site.test" },
          body: route.method === "POST" ? new FormData() : undefined,
        });
        // NextRequest-like: some routes read nextUrl.
        Object.defineProperty(req, "nextUrl", { value: new URL(req.url) });
        const res = await mod[route.method]!(req);
        expect({ role, refused: [401, 403, 404].includes(res.status), effects }).toEqual({
          role,
          refused: true,
          effects: [],
        });
      }
    });

  test("Clerk webhook: no signature → refused, nothing written", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_" + btoa("test-secret-test-secret-123456");
    const { POST } = await import(join(process.cwd(), "src/app/api/webhooks/clerk/route.ts"));
    const res = await POST(
      new Request("https://site.test/api/webhooks/clerk", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(400);
    expect(effects).toEqual([]);
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  });
});
