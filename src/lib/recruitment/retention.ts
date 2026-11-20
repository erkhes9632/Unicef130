/**
 * Privacy clean-up: rejected applications are deleted N days after their period closed
 * (admin setting "membership.rejectedRetentionDays", default 90). Runs from the Worker's daily
 * cron trigger (worker.ts), so it must not import server-only / Next.js modules.
 */
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { activityLog, applications, rateLimit, recruitmentPeriods, settings } from "@/db/schema";
import type * as schema from "@/db/schema";
import { DEFAULT_REJECTED_RETENTION_DAYS, retentionCutoff } from "./logic";

type Db = DrizzleD1Database<typeof schema>;

async function retentionDays(db: Db): Promise<number> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "membership"))
    .limit(1);
  const days = (row?.value as { rejectedRetentionDays?: unknown } | undefined)
    ?.rejectedRetentionDays;
  return typeof days === "number" && days >= 1 ? days : DEFAULT_REJECTED_RETENTION_DAYS;
}

/** Deletes expired rejected applications (and their audit rows); returns how many. */
export async function purgeExpiredRejected(db: Db, now: number = Date.now()): Promise<number> {
  const cutoff = retentionCutoff(await retentionDays(db), now);
  const expired = await db
    .select({ id: applications.id })
    .from(applications)
    .innerJoin(recruitmentPeriods, eq(applications.periodId, recruitmentPeriods.id))
    .where(
      and(
        eq(applications.status, "rejected"),
        isNotNull(applications.periodId),
        lt(recruitmentPeriods.closesAt, cutoff),
      ),
    );
  const ids = expired.map((e) => e.id);
  if (ids.length === 0) return 0;
  // D1 limits bound parameters per statement: delete in chunks.
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    await db.delete(applications).where(inArray(applications.id, chunk));
    await db
      .delete(activityLog)
      .where(and(eq(activityLog.entityType, "application"), inArray(activityLog.entityId, chunk)));
  }
  await db.insert(activityLog).values({
    userId: null,
    action: "application.retention",
    entityType: "application",
    summary: `Хадгалах хугацаа дууссан ${ids.length} тэнцээгүй өргөдлийг автоматаар устгав`,
  });
  return ids.length;
}

/** Rate-limit rows (keyed by a hashed address or an account id) older than a day are useless. */
export const RATE_LIMIT_KEEP_MS = 86_400_000;

/** Deletes stale rate-limit rows so the table doesn't grow forever (daily cron). */
export async function purgeStaleRateLimits(db: Db, now: number = Date.now()): Promise<void> {
  await db.delete(rateLimit).where(lt(rateLimit.lastRequest, now - RATE_LIMIT_KEEP_MS));
}
