import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { applications, eventSignups, members, users } from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { purgeApplications } from "@/lib/recruitment/admin-ops";

/** What an anonymized member row keeps: school year and hours (for the yearly totals). */
export const ANONYMIZED_MEMBER = {
  name: "Устгагдсан гишүүн",
  nameEn: null,
  role: "",
  roleEn: null,
  className: "",
  photoUrl: null,
  showPhoto: false,
  showPublicly: false,
  active: false,
  email: null,
  team: "",
  userId: null,
  anonymized: true,
} as const;

/**
 * Removes an account's personal data from D1 (after the Clerk user is gone, or from the
 * `user.deleted` webhook — safe to run twice):
 * - applications are deleted (with the audit rows that pointed at them),
 * - the member row is anonymized: hours and school year stay, so totals don't drop,
 * - event sign-ups and the `users` row are deleted.
 */
export async function removeUserData(db: Database, userId: string, actor: { id: string } | null) {
  const apps = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.userId, userId));
  await purgeApplications(
    db,
    actor,
    apps.map((a) => a.id),
  );
  await db
    .update(members)
    .set({ ...ANONYMIZED_MEMBER, updatedAt: new Date() })
    .where(eq(members.userId, userId));
  await db.delete(eventSignups).where(eq(eventSignups.userId, userId));
  const removed = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  if (removed.length > 0) {
    await logActivity(actor, "user.delete", {
      type: "user",
      id: userId,
      summary: `Бүртгэл #${shortId(userId)} устгаж, хувийн мэдээллийг арилгав`,
    });
  }
}
