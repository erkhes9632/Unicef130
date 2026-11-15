import "server-only";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { eventSignups, events, members, volunteerHours } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { placeHolding, signupOpen, yearTotals } from "./logic";

/** Everything /me shows for one account (only that account's own data). */
export async function getMyMemberPage(userId: string, locale: Locale) {
  const db = await getDb();
  const [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);

  const [hours, attended, upcoming, mySignups] = await Promise.all([
    member
      ? db
          .select({
            id: volunteerHours.id,
            schoolYear: volunteerHours.schoolYear,
            hours: volunteerHours.hours,
            date: volunteerHours.date,
            note: volunteerHours.note,
            eventTitle: events.title,
            eventTitleEn: events.titleEn,
          })
          .from(volunteerHours)
          .leftJoin(events, eq(volunteerHours.eventId, events.id))
          .where(eq(volunteerHours.memberId, member.id))
          .orderBy(desc(volunteerHours.date))
      : Promise.resolve([]),
    db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        titleEn: events.titleEn,
        startsAt: events.startsAt,
      })
      .from(eventSignups)
      .innerJoin(events, eq(eventSignups.eventId, events.id))
      .where(and(eq(eventSignups.userId, userId), eq(eventSignups.status, "attended")))
      .orderBy(desc(events.startsAt)),
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.published, true),
          eq(events.signupEnabled, true),
          gt(events.startsAt, new Date()),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(20),
    db
      .select({ eventId: eventSignups.eventId, status: eventSignups.status })
      .from(eventSignups)
      .where(eq(eventSignups.userId, userId)),
  ]);

  const upcomingIds = upcoming.map((e) => e.id);
  const taken = upcomingIds.length
    ? await db
        .select({ eventId: eventSignups.eventId, n: count() })
        .from(eventSignups)
        .where(
          and(
            inArray(eventSignups.eventId, upcomingIds),
            inArray(eventSignups.status, [...placeHolding]),
          ),
        )
        .groupBy(eventSignups.eventId)
    : [];
  const takenBy = new Map(taken.map((t) => [t.eventId, t.n]));
  const mine = new Map(mySignups.map((s) => [s.eventId, s.status]));

  return {
    member: member
      ? {
          name: pick(locale, member.name, member.nameEn),
          className: member.className,
          team: member.team,
          schoolYear: member.schoolYear,
          since: member.createdAt,
        }
      : null,
    totals: yearTotals(hours, {
      schoolYear: member?.schoolYear ?? null,
      hours: member?.volunteerHours ?? null,
    }),
    importedTotal:
      member?.volunteerHours && member.schoolYear
        ? { schoolYear: member.schoolYear, hours: member.volunteerHours }
        : null,
    history: hours.map((h) => ({
      id: h.id,
      hours: h.hours,
      date: h.date,
      note: h.note,
      event: h.eventTitle ? pick(locale, h.eventTitle, h.eventTitleEn) : null,
    })),
    attended: attended.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: pick(locale, e.title, e.titleEn),
      startsAt: e.startsAt,
    })),
    upcoming: upcoming.map((e) => {
      const placesTaken = takenBy.get(e.id) ?? 0;
      return {
        id: e.id,
        slug: e.slug,
        title: pick(locale, e.title, e.titleEn),
        startsAt: e.startsAt,
        location: pick(locale, e.location, e.locationEn),
        open: signupOpen(e),
        capacity: e.signupCapacity,
        placesLeft: e.signupCapacity === null ? null : Math.max(0, e.signupCapacity - placesTaken),
        deadline: e.signupDeadline,
        myStatus: mine.get(e.id) ?? null,
      };
    }),
  };
}
