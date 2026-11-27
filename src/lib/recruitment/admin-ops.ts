import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, type Database } from "@/db";
import {
  activityLog,
  applications,
  members,
  recruitmentPeriods,
  users,
  type ApplicationStatus,
} from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { addToYear } from "@/lib/members/years";
import { setRole } from "@/lib/users/clerk-admin";
import { memberDisplayName } from "./logic";

// Server-side helpers for admin Server Actions. Kept out of "use server" files on purpose: an
// exported function there becomes a network endpoint, and these trust their `actor` argument.

type Application = typeof applications.$inferSelect;

/**
 * An accepted applicant becomes a member of the current school year (once): the account's
 * existing member row is reused, otherwise a hidden one is created (not listed publicly until
 * an admin records consent for that year).
 */
async function ensureMember(db: Database, app: Application, year: string) {
  if (app.memberId) {
    await db.update(members).set({ active: true }).where(eq(members.id, app.memberId));
    await addToYear(db, app.memberId, year);
    return app.memberId;
  }
  const [linked] = app.userId
    ? await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.userId, app.userId))
        .limit(1)
    : [];
  let memberId = linked?.id;
  if (memberId) {
    await db.update(members).set({ active: true }).where(eq(members.id, memberId));
  } else {
    const [period] = app.periodId
      ? await db
          .select({ schoolYear: recruitmentPeriods.schoolYear })
          .from(recruitmentPeriods)
          .where(eq(recruitmentPeriods.id, app.periodId))
          .limit(1)
      : [];
    const [member] = await db
      .insert(members)
      .values({
        name: memberDisplayName(app.fullName),
        role: "Гишүүн",
        roleEn: "Member",
        className: app.className,
        group: "member",
        showPublicly: false,
        showPhoto: false,
        active: true,
        sortOrder: 500,
        schoolYear: period?.schoolYear ?? null,
        userId: app.userId,
        email: app.email,
      })
      .returning({ id: members.id });
    memberId = member!.id;
  }
  await addToYear(db, memberId, year);
  await db.update(applications).set({ memberId }).where(eq(applications.id, app.id));
  return memberId;
}

/**
 * Applies a decision. Accepted → member row in the current school year + role "member". Moving an accepted
 * application to another status takes the member role back (admins keep theirs) and marks the
 * member row inactive. Returns how many applications changed.
 */
export async function applyStatus(
  actor: { id: string },
  ids: string[],
  status: ApplicationStatus,
): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(applications).where(inArray(applications.id, ids));
  const year = await getCurrentSchoolYear();
  let changed = 0;
  for (const app of rows) {
    if (app.status === status) continue;
    await db
      .update(applications)
      .set({ status, decidedBy: actor.id, decidedAt: new Date() })
      .where(eq(applications.id, app.id));

    const [account] = app.userId
      ? await db.select({ role: users.role }).from(users).where(eq(users.id, app.userId)).limit(1)
      : [];
    if (status === "accepted") {
      await ensureMember(db, app, year);
      if (account && !account.role) await setRole(db, app.userId!, "member");
    } else if (app.status === "accepted") {
      if (account?.role === "member") await setRole(db, app.userId!, null);
      if (app.memberId)
        await db.update(members).set({ active: false }).where(eq(members.id, app.memberId));
    }
    // The log refers to applications by id only: no names of minors in the audit trail.
    await logActivity(actor, "application.status", {
      type: "application",
      id: app.id,
      summary: `Өргөдөл #${shortId(app.id)} — төлөв өөрчлөв`,
      changes: { status: [app.status, status] },
    });
    changed++;
  }
  return changed;
}

/**
 * Deletes applications (personal data of minors) and the audit rows that pointed at them; one
 * neutral row remains. Shared with account deletion and the retention clean-up.
 */
export async function purgeApplications(
  db: Database,
  actor: { id: string } | null,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const deleted = await db
    .delete(applications)
    .where(inArray(applications.id, ids))
    .returning({ id: applications.id });
  if (deleted.length === 0) return 0;
  await db.delete(activityLog).where(
    and(
      eq(activityLog.entityType, "application"),
      inArray(
        activityLog.entityId,
        deleted.map((d) => d.id),
      ),
    ),
  );
  await logActivity(actor, "application.delete", {
    type: "application",
    summary:
      deleted.length === 1
        ? `Өргөдөл #${shortId(deleted[0]!.id)} устгав`
        : `${deleted.length} өргөдөл устгав`,
  });
  return deleted.length;
}
