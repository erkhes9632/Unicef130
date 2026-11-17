import "server-only";
import type { Database } from "@/db";
import { removeUserData } from "./delete";
import { mirrorFromClerk, upsertUser } from "./sync";

type ClerkEvent = { type: string; data: unknown };

/**
 * Applies a verified Clerk webhook event to D1:
 * - user.created / user.updated → upsert the mirror row (role, ban, e-mail, name),
 * - user.deleted → remove the account's personal data (same as an admin delete).
 * Other events are acknowledged and ignored.
 */
export async function handleClerkEvent(
  db: Database,
  event: ClerkEvent,
): Promise<"upserted" | "deleted" | "ignored"> {
  if (event.type === "user.created" || event.type === "user.updated") {
    const mirror = mirrorFromClerk(event.data);
    if (!mirror) return "ignored";
    await upsertUser(db, mirror);
    return "upserted";
  }
  if (event.type === "user.deleted") {
    const id = (event.data as { id?: unknown } | null)?.id;
    if (typeof id !== "string" || !id) return "ignored";
    await removeUserData(db, id, null);
    return "deleted";
  }
  return "ignored";
}
