import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/schema";

/**
 * Login attempt limiter for the admin login Server Action (Server Actions call Better Auth
 * directly, so its HTTP rate limiter does not apply). Counters live in D1 (`rate_limit`), shared
 * by all Worker isolates. Failed attempts are counted per email and per IP.
 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_PER_EMAIL = 5;
export const LOGIN_MAX_PER_IP = 20;

const keys = (email: string, ip: string | null) => [
  { key: `login:email:${email}`, max: LOGIN_MAX_PER_EMAIL },
  ...(ip ? [{ key: `login:ip:${ip}`, max: LOGIN_MAX_PER_IP }] : []),
];

/** Pure check (exported for tests): is a counter still blocking at `now`? */
export function isBlocked(
  row: { count: number; lastRequest: number } | undefined,
  max: number,
  now: number,
) {
  return !!row && now - row.lastRequest < LOGIN_WINDOW_MS && row.count >= max;
}

/** Minutes until the user may try again, or 0 when not blocked. */
export async function loginBlockedFor(email: string, ip: string | null): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  let wait = 0;
  for (const { key, max } of keys(email, ip)) {
    const [row] = await db.select().from(rateLimit).where(eq(rateLimit.key, key)).limit(1);
    if (isBlocked(row, max, now)) {
      wait = Math.max(wait, Math.ceil((row!.lastRequest + LOGIN_WINDOW_MS - now) / 60_000));
    }
  }
  return wait;
}

export async function recordLoginFailure(email: string, ip: string | null) {
  const db = await getDb();
  const now = Date.now();
  for (const { key } of keys(email, ip)) {
    await db
      .insert(rateLimit)
      .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
      .onConflictDoUpdate({
        target: rateLimit.key,
        // Restart the window when the previous one has expired.
        set: {
          count: sql`case when ${now} - ${rateLimit.lastRequest} >= ${LOGIN_WINDOW_MS} then 1 else ${rateLimit.count} + 1 end`,
          lastRequest: now,
        },
      });
  }
}

export async function clearLoginFailures(email: string) {
  const db = await getDb();
  await db.delete(rateLimit).where(eq(rateLimit.key, `login:email:${email}`));
}
