import { and, asc, desc, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { normalizeSdgs } from "@/lib/sdg";
import { clubDirections, type ClubDirection, type RichTextDoc } from "@/lib/types";
import { pick } from "./localize";

/** Report numbers for an activity (all optional; unknown values are null/empty). */
export type ActivityFacts = {
  /** As written in the report ("137", "50+", "~500", "School community"). */
  inPerson: string | null;
  online: number | null;
  donationAmount: number | null;
  partners: string[];
  beneficiaries: string[];
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: RichTextDoc;
  coverUrl: string | null;
  location: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  direction: ClubDirection | null;
  schoolYear: string | null;
  sdgs: number[];
  facts: ActivityFacts;
};

type Row = typeof events.$inferSelect;

export function eventToItem(locale: Locale, e: Row): EventItem {
  return {
    id: e.id,
    slug: e.slug,
    title: pick(locale, e.title, e.titleEn),
    summary: pick(locale, e.summary, e.summaryEn),
    content: pick(locale, e.content, e.contentEn),
    coverUrl: e.coverUrl,
    location: pick(locale, e.location, e.locationEn),
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    allDay: e.allDay,
    direction: (clubDirections as readonly string[]).includes(e.direction ?? "")
      ? (e.direction as ClubDirection)
      : null,
    schoolYear: e.schoolYear,
    sdgs: normalizeSdgs(e.sdgs),
    facts: {
      inPerson: pick(locale, e.reachInPerson, e.reachInPersonEn) || null,
      online: e.reachOnline,
      donationAmount: e.donationAmount && e.donationAmount > 0 ? e.donationAmount : null,
      partners: e.partners ?? [],
      beneficiaries: e.beneficiaries ?? [],
    },
  };
}
const toItem = eventToItem;

/** An event counts as upcoming until it ends (or until its start if it has no end time). */
export function isUpcoming(e: Pick<EventItem, "startsAt" | "endsAt">, now = Date.now()) {
  return Date.parse(e.endsAt ?? e.startsAt) >= now;
}

const upcomingWhere = (now: Date) =>
  and(
    eq(events.published, true),
    or(gte(events.endsAt, now), and(isNull(events.endsAt), gte(events.startsAt, now))),
  );
const pastWhere = (now: Date) =>
  and(
    eq(events.published, true),
    or(lt(events.endsAt, now), and(isNull(events.endsAt), lt(events.startsAt, now))),
  );

export async function listEvents(locale: Locale, scope: "upcoming" | "past", limit = 100) {
  const db = await getDb();
  const now = new Date();
  const rows =
    scope === "upcoming"
      ? await db
          .select()
          .from(events)
          .where(upcomingWhere(now))
          .orderBy(asc(events.startsAt))
          .limit(limit)
      : await db
          .select()
          .from(events)
          .where(pastWhere(now))
          .orderBy(desc(events.startsAt))
          .limit(limit);
  return rows.map((r) => toItem(locale, r));
}

export async function getUpcomingEvents(locale: Locale, limit = 3) {
  return listEvents(locale, "upcoming", limit);
}

/** Events that start within the given month (Ulaanbaatar time, UTC+8). `month` is 1–12. */
export async function getEventsInMonth(locale: Locale, year: number, month: number) {
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+08:00`);
  const db = await getDb();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), gte(events.startsAt, start), lt(events.startsAt, end)))
    .orderBy(asc(events.startsAt));
  return rows.map((r) => toItem(locale, r));
}

export async function getEventBySlug(locale: Locale, slug: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), eq(events.slug, slug)))
    .limit(1);
  return row ? toItem(locale, row) : null;
}

/** See searchNews for why matching happens in JS. */
export async function searchEvents(locale: Locale, query: string, limit = 20) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.published, true))
    .orderBy(desc(events.startsAt))
    .limit(500);
  const q = query.toLocaleLowerCase();
  return rows
    .filter((r) =>
      [r.title, r.titleEn ?? "", r.summary, r.summaryEn ?? "", r.location].some((f) =>
        f.toLocaleLowerCase().includes(q),
      ),
    )
    .slice(0, limit)
    .map((r) => toItem(locale, r));
}

/** All published activities of a school year, oldest first (impact timeline, About page). */
export async function listYearActivities(locale: Locale, schoolYear: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), eq(events.schoolYear, schoolYear)))
    .orderBy(asc(events.startsAt));
  return rows.map((r) => toItem(locale, r));
}

export async function getEventById(locale: Locale, id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), eq(events.id, id)))
    .limit(1);
  return row ? toItem(locale, row) : null;
}

/** Published activities that belong to one of the club's directions, newest first. */
export async function listDirectionActivities(locale: Locale) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), isNotNull(events.direction)))
    .orderBy(desc(events.startsAt));
  return rows.map((r) => toItem(locale, r));
}
