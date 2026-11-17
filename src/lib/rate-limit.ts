import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/schema";

type RateLimitResult = { allowed: boolean; count: number; retryAfterSec: number };

/** Pure decision for a fixed window that starts at the first counted request. */
function decideRateLimit(
  row: { count: number; lastRequest: number },
  max: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const allowed = row.count <= max;
  return {
    allowed,
    count: row.count,
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((row.lastRequest + windowMs - now) / 1000)),
  };
}

/**
 * Counts one hit for `key` in D1 (shared by all Worker isolates) and says whether it is within
 * `max` per `windowMs`. One atomic statement: the counter restarts when the window has passed.
 * Keys are namespaced by the caller, e.g. `join:ip:<ip>`.
 */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const db = await getDb();
  const now = Date.now();
  const expired = sql`${now} - ${rateLimit.lastRequest} >= ${windowMs}`;
  const [row] = await db
    .insert(rateLimit)
    .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: sql`case when ${expired} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning({ count: rateLimit.count, lastRequest: rateLimit.lastRequest });
  return decideRateLimit(row ?? { count: 1, lastRequest: now }, max, windowMs, now);
}

/**
 * Keyed hash of a network address, so limits work without storing the address itself. The key
 * is derived from the Clerk secret (server-only), so the hash can't be reversed by guessing.
 */
export async function hashIp(ip: string | null) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`ip-hash:${process.env.CLERK_SECRET_KEY ?? ""}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip ?? "unknown"));
  return Array.from(new Uint8Array(sig).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
}
