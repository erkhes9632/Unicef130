/**
 * Every exported Server Action, called directly (as an attacker would, bypassing the UI) without
 * the right role, refuses before it reads or writes anything: no database call, no Clerk call,
 * no file deletion, no cache revalidation. The list of actions is discovered from the
 * "use server" files, so a new action is covered automatically.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
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

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const actionFiles = walk("src/app").filter(
  (f) => /\.tsx?$/.test(f) && /^["']use server["']/.test(readFileSync(f, "utf8")),
);

/** Who may call the actions of a file (the strictest rule in it is checked per function). */
function requirementOf(file: string, fn: string): "admin" | "member" | "signed-in" {
  if (file.includes(join("src", "app", "admin"))) return "admin";
  const src = readFileSync(file, "utf8");
  const body = src.slice(src.indexOf(`export async function ${fn}(`));
  const next = body.indexOf("\nexport ", 1);
  return /assertMember\(\)/.test(next > 0 ? body.slice(0, next) : body) ? "member" : "signed-in";
}

const REFUSAL =
  /unauthenticated|forbidden|Дахин нэвтэрнэ|эрх байхгүй|нэвтэрнэ үү|sign in|"ok":false/i;
/** Plausible arguments of every shape the actions take (ids, form state, FormData, flags). */
const args = () => ["x", { ok: true }, new FormData(), "x", true];

async function outcome(fn: (...a: unknown[]) => Promise<unknown>) {
  try {
    const res = await fn(...args());
    return { refused: REFUSAL.test(JSON.stringify(res ?? null)), detail: JSON.stringify(res) };
  } catch (err) {
    const e = err as { code?: string; digest?: string; message?: string };
    const refused =
      err instanceof AuthError || /NEXT_REDIRECT;.*sign-in|NEXT_HTTP_ERROR/.test(e.digest ?? "");
    return { refused, detail: `${e.message} ${e.digest ?? ""}` };
  }
}

beforeEach(() => {
  me = null;
  effects.length = 0;
});

describe("every Server Action refuses callers without the right role", () => {
  test("the action files were found", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(15);
  });

  const callers: { who: string; role: Role | "signed-out" }[] = [
    { who: "signed out", role: "signed-out" },
    { who: "applicant (no role)", role: null },
    { who: "member", role: "member" },
  ];

  for (const file of actionFiles)
    test(file, async () => {
      const mod = (await import(join(process.cwd(), file))) as Record<string, unknown>;
      const names = Object.keys(mod).filter((k) => typeof mod[k] === "function");
      expect(names.length).toBeGreaterThan(0);
      const problems: string[] = [];
      for (const name of names) {
        const need = requirementOf(file, name);
        for (const { who, role } of callers) {
          const allowed =
            role !== "signed-out" && (need === "signed-in" || (need === "member" && role !== null));
          if (allowed) continue;
          me =
            role === "signed-out"
              ? null
              : { id: "u1", email: "u1@x.mn", name: "U", role, applyBlocked: false };
          effects.length = 0;
          const r = await outcome(mod[name] as (...a: unknown[]) => Promise<unknown>);
          if (!r.refused || effects.length)
            problems.push(
              `${name} as ${who}: refused=${r.refused} effects=[${effects.join(",")}] ${r.detail.slice(0, 120)}`,
            );
        }
      }
      expect(problems).toEqual([]);
    });
});
