import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { and, count, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { users } from "@/db/schema";
import type { AppRole } from "@/lib/auth/roles";

/**
 * Writes to Clerk (the source of truth for roles and bans) and then to the D1 mirror, so pages
 * see the change immediately; the webhook later confirms the same values.
 */
export async function setRole(db: Database, userId: string, role: AppRole | null) {
  const client = await clerkClient();
  // Clerk merges metadata: `null` removes the key.
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } });
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setBanned(db: Database, userId: string, banned: boolean) {
  const client = await clerkClient();
  if (banned) await client.users.banUser(userId);
  else await client.users.unbanUser(userId);
  await db.update(users).set({ banned, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function deleteClerkUser(userId: string) {
  const client = await clerkClient();
  await client.users.deleteUser(userId);
}

/** Admins who can still sign in (the "last admin" guard counts these). */
export async function countActiveAdmins(db: Database) {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.banned, false)));
  return row?.n ?? 0;
}
