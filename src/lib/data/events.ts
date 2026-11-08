import type { Locale } from "@/i18n/routing";
import { mockEvents } from "@/lib/mock/events";
import type { ClubEvent, RichTextDoc } from "@/lib/types";
import { pick } from "./localize";

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
};

function toItem(locale: Locale, e: ClubEvent): EventItem {
  return {
    id: e.id,
    slug: e.slug,
    title: pick(locale, e.title, e.titleEn),
    summary: pick(locale, e.summary, e.summaryEn),
    content: pick(locale, e.content, e.contentEn),
    coverUrl: e.coverUrl,
    location: pick(locale, e.location, e.locationEn),
    startsAt: e.startsAt,
    endsAt: e.endsAt,
  };
}

/** An event counts as upcoming until it ends (or until its start if it has no end time). */
export function isUpcoming(e: Pick<EventItem, "startsAt" | "endsAt">, now = Date.now()) {
  return Date.parse(e.endsAt ?? e.startsAt) >= now;
}

// Phase 5: replace with D1 queries (Drizzle). Keep the signatures.
async function publishedEvents(): Promise<ClubEvent[]> {
  return mockEvents
    .filter((e) => e.published)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export async function listEvents(locale: Locale, scope: "upcoming" | "past") {
  const items = (await publishedEvents()).map((e) => toItem(locale, e));
  const now = Date.now();
  return scope === "upcoming"
    ? items.filter((e) => isUpcoming(e, now))
    : items.filter((e) => !isUpcoming(e, now)).reverse();
}

export async function getUpcomingEvents(locale: Locale, limit = 3) {
  return (await listEvents(locale, "upcoming")).slice(0, limit);
}

/** Events that start within the given month (Ulaanbaatar time, UTC+8). `month` is 1–12. */
export async function getEventsInMonth(locale: Locale, year: number, month: number) {
  const start = Date.parse(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = Date.parse(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+08:00`);
  return (await publishedEvents())
    .filter((e) => {
      const t = Date.parse(e.startsAt);
      return t >= start && t < end;
    })
    .map((e) => toItem(locale, e));
}

export async function getEventBySlug(locale: Locale, slug: string) {
  const e = (await publishedEvents()).find((ev) => ev.slug === slug);
  return e ? toItem(locale, e) : null;
}

export async function searchEvents(locale: Locale, query: string, limit = 20) {
  const q = query.toLocaleLowerCase();
  return (await publishedEvents())
    .map((e) => toItem(locale, e))
    .filter((e) => [e.title, e.summary, e.location].some((f) => f.toLocaleLowerCase().includes(q)))
    .reverse()
    .slice(0, limit);
}
