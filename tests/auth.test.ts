import { describe, expect, test } from "bun:test";
import { userRoles } from "@/db/schema";
import { can, needsTwoFactorSetup, permissions, permissionsOf } from "@/lib/auth/roles";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import {
  generateToken,
  hashToken,
  isWellFormedToken,
  TOKEN_TTL_MS,
  tokenState,
} from "@/lib/auth/tokens";
import { describeUserAgent } from "@/lib/auth/user-agent";
import { decideRateLimit } from "@/lib/rate-limit";

describe("roles → permissions", () => {
  test("matrix", () => {
    const matrix = Object.fromEntries(
      userRoles.map((r) => [r, permissions.filter((p) => can(r, p))]),
    );
    expect(matrix).toEqual({
      admin: ["content", "members", "applications", "messages", "admin"],
      editor: ["content", "members"],
      reviewer: ["applications"],
    });
  });
  test("unknown roles get nothing", () => {
    for (const role of ["owner", "", null, undefined, 1]) {
      expect(permissionsOf(role)).toEqual([]);
      expect(can(role, "content")).toBe(false);
    }
  });
});

describe("two-factor requirement", () => {
  test("only admins without 2FA are held back, and only while the setting is on", () => {
    expect(needsTwoFactorSetup({ role: "admin", twoFactorEnabled: false }, true)).toBe(true);
    expect(needsTwoFactorSetup({ role: "admin", twoFactorEnabled: true }, true)).toBe(false);
    expect(needsTwoFactorSetup({ role: "admin", twoFactorEnabled: false }, false)).toBe(false);
    expect(needsTwoFactorSetup({ role: "editor", twoFactorEnabled: false }, true)).toBe(false);
    expect(needsTwoFactorSetup({ role: "reviewer", twoFactorEnabled: false }, true)).toBe(false);
  });
});

describe("one-time link tokens", () => {
  test("tokens are random, URL-safe and only their hash is comparable", async () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken("../etc/passwd")).toBe(false);
    expect(isWellFormedToken(a + "x")).toBe(false);
    const hash = await hashToken(a);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(a);
    expect(await hashToken(a)).toBe(hash);
    expect(await hashToken(b)).not.toBe(hash);
  });
  test("state: valid for 72 h, then expired; used once", () => {
    const now = 1_800_000_000_000;
    const row = { usedAt: null, expiresAt: new Date(now + TOKEN_TTL_MS) };
    expect(TOKEN_TTL_MS).toBe(72 * 3600 * 1000);
    expect(tokenState(row, now)).toBe("valid");
    expect(tokenState(row, now + TOKEN_TTL_MS)).toBe("expired");
    expect(tokenState({ ...row, usedAt: new Date(now) }, now)).toBe("used");
    expect(tokenState(undefined, now)).toBe("missing");
  });
});

describe("password policy", () => {
  test("12+ characters, typed twice", () => {
    expect(newPasswordSchema.safeParse({ password: "short", repeat: "short" }).success).toBe(false);
    expect(
      newPasswordSchema.safeParse({ password: "long-enough-12", repeat: "long-enough-13" }).success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({ password: "long-enough-12", repeat: "long-enough-12" }).success,
    ).toBe(true);
  });
});

describe("rate limit decision", () => {
  test("allows up to max hits per window and reports when to retry", () => {
    const now = 1_000_000;
    expect(decideRateLimit({ count: 3, lastRequest: now }, 3, 60_000, now).allowed).toBe(true);
    const blocked = decideRateLimit({ count: 4, lastRequest: now - 20_000 }, 3, 60_000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(40);
  });
});

describe("session device labels", () => {
  test("browser and OS", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari · iOS");
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"),
    ).toBe("Chrome · Windows");
    expect(describeUserAgent(null)).toBe("Тодорхойгүй төхөөрөмж");
  });
});

describe("audit diff", () => {
  test("reports only changed fields, shortens long values, hides nested data", async () => {
    const { diffFields, shortId } = await import("@/lib/admin/audit-diff");
    const before = { title: "A", status: "draft", body: "x".repeat(200), tags: ["a"], n: 1 };
    const changes = diffFields(
      before,
      { title: "A", status: "published", body: "y".repeat(200), tags: ["b"], n: 1 },
      ["title", "status", "body", "tags", "n"],
    );
    expect(Object.keys(changes ?? {})).toEqual(["status", "body", "tags"]);
    expect(changes?.status).toEqual(["draft", "published"]);
    expect(String(changes?.body?.[0]).length).toBeLessThanOrEqual(80);
    expect(changes?.tags).toEqual(["…", "…"]);
    expect(diffFields(before, { title: "A" }, ["title"])).toBeUndefined();
    expect(shortId("0123456789abcdef")).toBe("01234567");
  });
});
