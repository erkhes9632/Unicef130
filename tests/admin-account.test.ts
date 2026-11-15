import { describe, expect, test } from "bun:test";
import {
  clearTwoFactorStatements,
  createStatements,
  inlineParams,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  passwordProblem,
  resetStatements,
} from "../scripts/lib/admin-account";

describe("admin account script: input checks", () => {
  test("emails are trimmed, lower-cased and validated", () => {
    expect(normalizeEmail("  Admin@Example.ORG ")).toBe("admin@example.org");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });

  test("password must be long enough and typed twice identically", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(passwordProblem("short", "short")).toMatch(/at least 12/);
    expect(passwordProblem("long-enough-pass", "long-enough-pasS")).toMatch(/do not match/);
    expect(passwordProblem("x".repeat(129), "x".repeat(129))).toMatch(/at most/);
    expect(passwordProblem("long-enough-pass", "long-enough-pass")).toBeNull();
  });
});

describe("admin account script: statements", () => {
  const base = { userId: "u1", accountId: "a1", email: "a@b.mn", hash: "pbkdf2$x", now: 1_800_000 };

  test("create inserts a verified user with the role and one credential account", () => {
    const s = createStatements({ ...base, name: "Админ", role: "admin" });
    expect(s.user.sql).toContain('INSERT INTO "user"');
    expect(s.user.params).toEqual(["u1", "Админ", "a@b.mn", "admin", "1800000"]);
    expect(s.account.sql).toContain("'credential'");
    expect(s.account.params).toEqual(["a1", "u1", "pbkdf2$x", "1800000"]);
    expect(s.rollback.params).toEqual(["u1"]);
  });

  test("reset updates the password, re-enables, signs out, clears the lockout and logs it", () => {
    const list = resetStatements({ ...base, logId: "l1" });
    const sql = list.map((s) => s.sql).join("\n");
    expect(sql).toContain('UPDATE "account" SET "password"');
    expect(sql).toContain('"banned" = 0');
    expect(sql).toContain('DELETE FROM "session"');
    expect(sql).toContain('DELETE FROM "rate_limit"');
    expect(sql).toContain("'user.reset_password'");
    // The role is untouched unless asked for.
    expect(sql).not.toContain('"role" =');
    expect(
      resetStatements({ ...base, logId: "l1", role: "admin" }).some((s) =>
        s.sql.includes('"role" = ?1'),
      ),
    ).toBe(true);
    // The hash is only ever passed as a bound parameter, never spliced into SQL text.
    expect(sql).not.toContain("pbkdf2$x");
    // The audit row carries no secret.
    expect(list.at(-1)!.params).toEqual(["l1", "u1", "1800000"]);
  });

  test("break-glass also clears two-factor (separate, tolerant statements)", () => {
    const sql = clearTwoFactorStatements("u1")
      .map((s) => s.sql)
      .join("\n");
    expect(sql).toContain('DELETE FROM "two_factor"');
    expect(sql).toContain('"two_factor_enabled" = 0');
  });

  test("inlineParams quotes values safely for the local CLI", () => {
    expect(inlineParams({ sql: "SELECT ?1, ?2, ?1", params: ["a'b", "c"] })).toBe(
      "SELECT 'a''b', 'c', 'a''b'",
    );
  });
});
