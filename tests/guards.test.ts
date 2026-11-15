/**
 * Server-side role guards (src/lib/auth/session.ts) with Clerk and D1 faked: the D1 row decides,
 * a missing row or a stale token claim is repaired from Clerk, banned accounts count as signed
 * out, and every guard refuses the wrong role.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";

type Row = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member" | null;
  banned: boolean;
  twoFactorEnabled: boolean;
  applyBlocked: boolean;
};

let session: { userId: string | null; sessionClaims: { role?: string | null } | null };
let d1: Map<string, Row>;
let clerkUsers: Map<string, Row>;
let clerkFetches = 0;

mock.module("@clerk/nextjs/server", () => ({
  auth: async () => session,
  clerkClient: async () => ({
    users: {
      getUser: async (id: string) => {
        clerkFetches++;
        const u = clerkUsers.get(id);
        if (!u) throw new Error("not found");
        return u;
      },
    },
  }),
}));
mock.module("@/db", () => ({ getDb: async () => ({}) }));
mock.module("@/lib/users/sync", () => ({
  findUser: async (_db: unknown, id: string) => d1.get(id) ?? null,
  // The fake Clerk user already has the mirror's shape.
  mirrorFromClerk: (u: Row) => u,
  upsertUser: async (_db: unknown, m: Row) => {
    d1.set(m.id, { ...m });
    return m;
  },
}));
mock.module("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  },
}));

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= `pk_test_${btoa("example.clerk.accounts.dev$")}`;
const guards = await import("@/lib/auth/session");

const row = (id: string, role: Row["role"], extra: Partial<Row> = {}): Row => ({
  id,
  email: `${id}@x.mn`,
  name: id,
  role,
  banned: false,
  twoFactorEnabled: false,
  applyBlocked: false,
  ...extra,
});
const signIn = (id: string | null, claimRole?: string | null) => {
  session = { userId: id, sessionClaims: id ? { role: claimRole ?? null } : null };
};
const redirectOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (err) {
    return String((err as { digest?: string }).digest).replace("NEXT_REDIRECT;", "");
  }
};
const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (err) {
    return err instanceof guards.AuthError ? err.code : String(err);
  }
};

beforeEach(() => {
  d1 = new Map();
  clerkUsers = new Map();
  clerkFetches = 0;
  signIn(null);
});

describe("getCurrentUser", () => {
  test("signed out → null, no lookups", async () => {
    expect(await guards.getCurrentUser()).toBeNull();
    expect(clerkFetches).toBe(0);
  });

  test("D1 row matching the token claim is used without calling Clerk", async () => {
    d1.set("a", row("a", "admin"));
    signIn("a", "admin");
    expect((await guards.getCurrentUser())?.role).toBe("admin");
    expect(clerkFetches).toBe(0);
  });

  test("first request (no D1 row yet) → fetched from Clerk and stored", async () => {
    clerkUsers.set("n", row("n", null));
    signIn("n", null);
    expect((await guards.getCurrentUser())?.id).toBe("n");
    expect(d1.has("n")).toBe(true);
    expect(clerkFetches).toBe(1);
  });

  test("demoted admin with a stale token claim gets the new role from Clerk", async () => {
    d1.set("a", row("a", "admin"));
    clerkUsers.set("a", row("a", "member"));
    signIn("a", "member");
    expect((await guards.getCurrentUser())?.role).toBe("member");
    expect(d1.get("a")?.role).toBe("member");
  });

  test("a forged/stale admin claim can't beat Clerk", async () => {
    d1.set("m", row("m", "member"));
    clerkUsers.set("m", row("m", "member"));
    signIn("m", "admin");
    expect((await guards.getCurrentUser())?.role).toBe("member");
  });

  test("banned accounts count as signed out", async () => {
    d1.set("b", row("b", "admin", { banned: true }));
    signIn("b", "admin");
    expect(await guards.getCurrentUser()).toBeNull();
  });
});

describe("page guards (redirect)", () => {
  test("requireAdmin: signed out → /sign-in, member/applicant → /", async () => {
    expect(await redirectOf(guards.requireAdmin())).toBe("/sign-in");
    d1.set("m", row("m", "member"));
    signIn("m", "member");
    expect(await redirectOf(guards.requireAdmin())).toBe("/");
    d1.set("u", row("u", null));
    signIn("u", null);
    expect(await redirectOf(guards.requireAdmin())).toBe("/");
    d1.set("a", row("a", "admin"));
    signIn("a", "admin");
    expect(await redirectOf(guards.requireAdmin())).toBeNull();
  });

  test("requireMember: applicant → /join (or /en/join), members and admins pass", async () => {
    expect(await redirectOf(guards.requireMember("en"))).toBe("/en/sign-in");
    d1.set("u", row("u", null));
    signIn("u", null);
    expect(await redirectOf(guards.requireMember())).toBe("/join");
    expect(await redirectOf(guards.requireMember("en"))).toBe("/en/join");
    d1.set("m", row("m", "member"));
    signIn("m", "member");
    expect(await redirectOf(guards.requireMember())).toBeNull();
    d1.set("a", row("a", "admin"));
    signIn("a", "admin");
    expect(await redirectOf(guards.requireMember())).toBeNull();
  });
});

describe("Server Action guards (throw)", () => {
  test("assertAdmin", async () => {
    expect(await codeOf(guards.assertAdmin())).toBe("unauthenticated");
    d1.set("m", row("m", "member"));
    signIn("m", "member");
    expect(await codeOf(guards.assertAdmin())).toBe("forbidden");
    d1.set("a", row("a", "admin"));
    signIn("a", "admin");
    expect(await codeOf(guards.assertAdmin())).toBe("ok");
  });

  test("assertMember refuses applicants", async () => {
    d1.set("u", row("u", null));
    signIn("u", null);
    expect(await codeOf(guards.assertMember())).toBe("forbidden");
    d1.set("m", row("m", "member"));
    signIn("m", "member");
    expect(await codeOf(guards.assertMember())).toBe("ok");
  });

  test("assertSignedIn accepts any non-banned account", async () => {
    expect(await codeOf(guards.assertSignedIn())).toBe("unauthenticated");
    d1.set("u", row("u", null));
    signIn("u", null);
    expect(await codeOf(guards.assertSignedIn())).toBe("ok");
    d1.set("u", row("u", null, { banned: true }));
    expect(await codeOf(guards.assertSignedIn())).toBe("unauthenticated");
  });
});
