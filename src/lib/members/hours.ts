import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { eventSignups, events, members, users, volunteerHours } from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { schoolYearOf } from "@/lib/school-year";

// Admin helpers for attendance and the hours log. Not a "use server" module: callers (admin
// Server Actions) check the role first and pass the acting admin.

/** School year an event's hours count towards: the event's own, else by its date. */
export function eventSchoolYear(event: { schoolYear: string | null; startsAt: Date }) {
  return event.schoolYear ?? schoolYearOf(event.startsAt);
}

/** The member row linked to an account (attendance needs one to count hours). */
async function memberOfUser(db: Database, userId: string) {
  const [m] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.anonymized, false)))
    .limit(1);
  return m?.id ?? null;
}

/**
 * Marks one sign-up attended (with hours) or absent / back to registered. Attended writes one
 * hours entry for (member, event) — replacing an earlier one — and anything else removes it.
 * Returns false when the sign-up does not exist; "no-member" when the account has no member row.
 */
export async function setAttendance(
  db: Database,
  actor: { id: string },
  signupId: string,
  status: "attended" | "absent" | "registered",
  hours: number | null,
): Promise<"ok" | "not-found" | "no-member"> {
  const [row] = await db
    .select({
      id: eventSignups.id,
      userId: eventSignups.userId,
      eventId: eventSignups.eventId,
      startsAt: events.startsAt,
      schoolYear: events.schoolYear,
    })
    .from(eventSignups)
    .innerJoin(events, eq(eventSignups.eventId, events.id))
    .where(eq(eventSignups.id, signupId))
    .limit(1);
  if (!row) return "not-found";
  const memberId = await memberOfUser(db, row.userId);
  if (status === "attended" && (!memberId || hours === null)) return "no-member";

  await db
    .update(eventSignups)
    .set({ status, updatedAt: new Date() })
    .where(eq(eventSignups.id, signupId));
  if (memberId) {
    await db
      .delete(volunteerHours)
      .where(and(eq(volunteerHours.memberId, memberId), eq(volunteerHours.eventId, row.eventId)));
    if (status === "attended" && hours !== null) {
      await db.insert(volunteerHours).values({
        memberId,
        eventId: row.eventId,
        schoolYear: eventSchoolYear(row),
        hours,
        date: row.startsAt,
        createdBy: actor.id,
      });
    }
  }
  await logActivity(actor, "event.attendance", {
    type: "event",
    id: row.eventId,
    summary: `Арга хэмжээ #${shortId(row.eventId)} — бүртгэл #${shortId(signupId)}: ${status}${status === "attended" ? ` (${hours} цаг)` : ""}`,
  });
  return "ok";
}

/** Sign-ups of an event with the volunteer's display name (member name, else account name). */
export async function listEventSignups(db: Database, eventId: string) {
  const rows = await db
    .select({
      id: eventSignups.id,
      status: eventSignups.status,
      createdAt: eventSignups.createdAt,
      userId: eventSignups.userId,
      accountName: users.name,
      accountEmail: users.email,
      memberId: members.id,
      memberName: members.name,
      className: members.className,
    })
    .from(eventSignups)
    .innerJoin(users, eq(eventSignups.userId, users.id))
    .leftJoin(members, eq(members.userId, eventSignups.userId))
    .where(eq(eventSignups.eventId, eventId))
    .orderBy(asc(eventSignups.createdAt));
  const memberIds = rows.flatMap((r) => (r.memberId ? [r.memberId] : []));
  const logged = memberIds.length
    ? await db
        .select({ memberId: volunteerHours.memberId, hours: volunteerHours.hours })
        .from(volunteerHours)
        .where(
          and(eq(volunteerHours.eventId, eventId), inArray(volunteerHours.memberId, memberIds)),
        )
    : [];
  const hoursOf = new Map(logged.map((l) => [l.memberId, l.hours]));
  return rows.map((r) => ({
    ...r,
    name: r.memberName || r.accountName || r.accountEmail,
    hours: r.memberId ? (hoursOf.get(r.memberId) ?? null) : null,
  }));
}

/** Manual / bulk hours: one entry per selected member. */
export async function addHoursEntries(
  db: Database,
  actor: { id: string },
  input: {
    memberIds: string[];
    hours: number;
    date: Date;
    schoolYear: string;
    note: string;
    eventId: string | null;
  },
) {
  const valid = await db
    .select({ id: members.id })
    .from(members)
    .where(and(inArray(members.id, input.memberIds), eq(members.anonymized, false)));
  if (valid.length === 0) return 0;
  await db.insert(volunteerHours).values(
    valid.map((m) => ({
      memberId: m.id,
      eventId: input.eventId,
      schoolYear: input.schoolYear,
      hours: input.hours,
      date: input.date,
      note: input.note,
      createdBy: actor.id,
    })),
  );
  await logActivity(actor, "hours.add", {
    type: "hours",
    summary: `${valid.length} гишүүнд ${input.hours} цаг нэмэв (${input.schoolYear})`,
  });
  return valid.length;
}

/** Entries of a school year, newest first, with member and event names (admin only). */
export async function listHoursEntries(db: Database, schoolYear: string, limit = 200) {
  return db
    .select({
      id: volunteerHours.id,
      hours: volunteerHours.hours,
      date: volunteerHours.date,
      note: volunteerHours.note,
      memberId: volunteerHours.memberId,
      memberName: members.name,
      eventTitle: events.title,
    })
    .from(volunteerHours)
    .leftJoin(members, eq(volunteerHours.memberId, members.id))
    .leftJoin(events, eq(volunteerHours.eventId, events.id))
    .where(eq(volunteerHours.schoolYear, schoolYear))
    .orderBy(desc(volunteerHours.date), desc(volunteerHours.createdAt))
    .limit(limit);
}
