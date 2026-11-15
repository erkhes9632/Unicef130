/**
 * Pure building blocks for scripts/create-admin.ts: input checks and the SQL statements for
 * creating an account or resetting its password. Kept free of I/O so they can be unit-tested.
 */
import { sqlValue } from "./sql";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/** One parameterized statement (`?1`, `?2`… placeholders; all params are strings). */
export type Statement = { sql: string; params: string[] };

export function normalizeEmail(raw: string | undefined): string | null {
  const email = raw?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

/** Returns a human-readable problem, or null when the password pair is acceptable. */
export function passwordProblem(password: string, repeat: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (password !== repeat) return "Passwords do not match.";
  return null;
}

export function findUserStatement(email: string): Statement {
  return {
    sql: `SELECT "id", "name", "role", "banned" FROM "user" WHERE lower("email") = ?1 LIMIT 1`,
    params: [email],
  };
}

export function createStatements(input: {
  userId: string;
  accountId: string;
  name: string;
  email: string;
  role: string;
  hash: string;
  now: number;
}): { user: Statement; account: Statement; rollback: Statement } {
  const now = String(input.now);
  return {
    user: {
      sql: `INSERT INTO "user" ("id", "name", "email", "email_verified", "role", "banned", "created_at", "updated_at")
            VALUES (?1, ?2, ?3, 1, ?4, 0, CAST(?5 AS INTEGER), CAST(?5 AS INTEGER))`,
      params: [input.userId, input.name, input.email, input.role, now],
    },
    account: {
      sql: `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
            VALUES (?1, ?2, 'credential', ?2, ?3, CAST(?4 AS INTEGER), CAST(?4 AS INTEGER))`,
      params: [input.accountId, input.userId, input.hash, now],
    },
    rollback: { sql: `DELETE FROM "user" WHERE "id" = ?1`, params: [input.userId] },
  };
}

/**
 * Break-glass password reset: new password hash, account re-enabled, every session signed out,
 * login lockout cleared, and one audit row (no secrets in it). `role` is changed only when given.
 */
export function resetStatements(input: {
  userId: string;
  email: string;
  hash: string;
  now: number;
  role?: string;
  accountId: string;
  logId: string;
}): Statement[] {
  const now = String(input.now);
  return [
    {
      sql: `UPDATE "account" SET "password" = ?1, "updated_at" = CAST(?2 AS INTEGER)
            WHERE "user_id" = ?3 AND "provider_id" = 'credential'`,
      params: [input.hash, now, input.userId],
    },
    {
      // Accounts created without a credential row (should not happen) still get a password.
      sql: `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
            SELECT ?1, ?2, 'credential', ?2, ?3, CAST(?4 AS INTEGER), CAST(?4 AS INTEGER)
            WHERE NOT EXISTS (SELECT 1 FROM "account" WHERE "user_id" = ?2 AND "provider_id" = 'credential')`,
      params: [input.accountId, input.userId, input.hash, now],
    },
    input.role
      ? {
          sql: `UPDATE "user" SET "banned" = 0, "role" = ?1, "updated_at" = CAST(?2 AS INTEGER) WHERE "id" = ?3`,
          params: [input.role, now, input.userId],
        }
      : {
          sql: `UPDATE "user" SET "banned" = 0, "updated_at" = CAST(?1 AS INTEGER) WHERE "id" = ?2`,
          params: [now, input.userId],
        },
    { sql: `DELETE FROM "session" WHERE "user_id" = ?1`, params: [input.userId] },
    { sql: `DELETE FROM "rate_limit" WHERE "key" = ?1`, params: [`login:email:${input.email}`] },
    {
      sql: `INSERT INTO "activity_log" ("id", "user_id", "action", "entity_type", "entity_id", "summary", "created_at")
            VALUES (?1, NULL, 'user.reset_password', 'user', ?2, 'Нууц үгийг терминалаас шинэчлэв (break-glass)', CAST(?3 AS INTEGER))`,
      params: [input.logId, input.userId, now],
    },
  ];
}

/**
 * Part of the break-glass reset: removes two-factor so the owner can log in with the new password
 * and enrol a new authenticator. Run separately (the tables exist only after migration 0004).
 */
export function clearTwoFactorStatements(userId: string): Statement[] {
  return [
    { sql: `DELETE FROM "two_factor" WHERE "user_id" = ?1`, params: [userId] },
    { sql: `UPDATE "user" SET "two_factor_enabled" = 0 WHERE "id" = ?1`, params: [userId] },
  ];
}

/** Inlines parameters for the local wrangler CLI (which has no bind API). */
export function inlineParams({ sql, params }: Statement): string {
  return sql.replace(/\?(\d+)/g, (_m, n: string) => sqlValue(params[Number(n) - 1]));
}
