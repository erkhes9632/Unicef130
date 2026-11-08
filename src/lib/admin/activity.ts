import "server-only";
import { getDb } from "@/db";
import { activityLog } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/session";

/** Records an admin action for the dashboard "recent activity" list. Never throws. */
export async function logActivity(
  user: CurrentUser | null,
  action: string,
  entity: { type: string; id?: string | null; summary?: string },
) {
  try {
    const db = await getDb();
    await db.insert(activityLog).values({
      userId: user?.id ?? null,
      action,
      entityType: entity.type,
      entityId: entity.id ?? null,
      summary: entity.summary ?? "",
    });
  } catch (err) {
    console.error("[activity] failed to log", action, err);
  }
}
