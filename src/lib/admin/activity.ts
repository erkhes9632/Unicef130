import "server-only";
import { getDb } from "@/db";
import { activityLog } from "@/db/schema";
import type { Changes } from "./audit-diff";

export { diffFields, shortId, type Changes } from "./audit-diff";

/**
 * Audit trail: records who did what to which record. Never throws (a logging failure must not
 * break the action). Summaries must not contain personal data of applicants — use ids.
 */
export async function logActivity(
  user: { id: string } | null,
  action: string,
  entity: { type: string; id?: string | null; summary?: string; changes?: Changes },
) {
  try {
    const db = await getDb();
    await db.insert(activityLog).values({
      userId: user?.id ?? null,
      action,
      entityType: entity.type,
      entityId: entity.id ?? null,
      summary: entity.summary ?? "",
      details: entity.changes ?? null,
    });
  } catch (err) {
    console.error("[activity] failed to log", action, err);
  }
}
