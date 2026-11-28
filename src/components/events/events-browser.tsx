"use client";

import { ArrowRight, CalendarDays, CalendarX2, List } from "lucide-react";
import { useSyncExternalStore } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { pickYear, YearChips, YearGroups, type YearLabels } from "@/components/common/year-groups";
import { Button } from "@/components/ui/button";
import { useUrlQuery } from "@/hooks/use-url-query";
import { Link } from "@/i18n/navigation";
import { isUpcoming, monthKey, parseMonth, shiftMonth, ubParts } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";
import { MonthCalendar, type CalendarEvent } from "./month-calendar";

const noSubscribe = () => () => {};
let loadedAt: number | undefined;
/** The visitor's clock, read once per page load (a stable snapshot). */
const clientNow = () => (loadedAt ??= Date.now());

export type EventMeta = CalendarEvent & { endsAt: string | null; year: string };

type Labels = {
  listView: string;
  calendarView: string;
  upcoming: string;
  past: string;
  emptyMonth: string;
  emptyUpcoming: string;
  emptyUpcomingHint: string;
  emptyUpcomingCta: string;
  emptyPast: string;
  pastTitle: string;
  allPast: string;
  calendar: React.ComponentProps<typeof MonthCalendar>["labels"];
  years: YearLabels;
};

const tabClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
    active
      ? "bg-card text-foreground shadow-soft ring-1 ring-border"
      : "text-muted-foreground hover:text-foreground",
  );

/**
 * Events of a cached page: all cards are rendered on the server once; the view (?view=calendar),
 * the tab (?tab=past) and the month (?month=YYYY-MM) are applied here, and "upcoming vs past" is
 * decided with the visitor's clock, so it is right even while the cached page is an hour old.
 */
/**
 * The calendar's first month: this month if it has events, else the month of the next event,
 * else the month of the latest one (an empty month is a dead end).
 */
export function defaultMonth(events: EventMeta[], upcoming: EventMeta[], now: number) {
  const current = ubParts(now);
  const has = (y: number, m: number) =>
    events.some((e) => {
      const p = ubParts(e.startsAt);
      return p.year === y && p.month === m;
    });
  if (has(current.year, current.month)) return { year: current.year, month: current.month };
  const pick = upcoming[0] ?? [...events].sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
  if (!pick) return { year: current.year, month: current.month };
  const p = ubParts(pick.startsAt);
  return { year: p.year, month: p.month };
}

export function EventsBrowser({
  locale,
  events,
  cards,
  joinCards,
  labels,
  renderedAt,
}: {
  locale: "mn" | "en";
  /** Server render time: used while hydrating, then the visitor's clock takes over. */
  renderedAt: number;
  events: EventMeta[];
  cards: Record<string, React.ReactNode>;
  /** Shown when the tab has nothing at all (with a "join" button). */
  joinCards: { upcoming: React.ReactNode; past: React.ReactNode };
  labels: Labels;
}) {
  const { query, setQuery } = useUrlQuery();
  // "Become a member" only for visitors and applicants (display hint; cached page).
  const view = query.get("view") === "calendar" ? "calendar" : "list";
  const scope = query.get("tab") === "past" ? "past" : "upcoming";
  const now = useSyncExternalStore(noSubscribe, clientNow, () => renderedAt);
  // School-year chips (list view): years that have events, newest first.
  const years = [...new Set(events.map((e) => e.year))].sort((a, b) => b.localeCompare(a));
  const year = pickYear(query.get("year"), years);
  const listed = year ? events.filter((e) => e.year === year) : events;
  // Upcoming: soonest first. Past: newest first. Both under one heading per school year.
  const upcoming = listed
    .filter((e) => isUpcoming(e, now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = listed
    .filter((e) => !isUpcoming(e, now))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const set = (next: Record<string, string | undefined>) => (e: React.MouseEvent) => {
    e.preventDefault();
    setQuery(next);
  };
  const cardGrid = (list: EventMeta[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((e) => (
        <div key={e.id} className="contents">
          {cards[e.id]}
        </div>
      ))}
    </div>
  );
  const grid = (list: EventMeta[]) => (
    <YearGroups items={list} labels={labels.years} render={cardGrid} />
  );

  let body: React.ReactNode;
  if (view === "calendar") {
    const { year, month } = query.get("month")
      ? parseMonth(query.get("month") ?? undefined, now)
      : defaultMonth(events, upcoming, now);
    const inMonth = events
      .filter((e) => {
        const p = ubParts(e.startsAt);
        return p.year === year && p.month === month;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    body = (
      <div className="space-y-8">
        <MonthCalendar
          locale={locale}
          year={year}
          month={month}
          events={inMonth.map((e) => ({ ...e, past: !isUpcoming(e, now) }))}
          labels={labels.calendar}
          onShift={(delta) => {
            const m = shiftMonth(year, month, delta);
            setQuery({ month: monthKey(m.year, m.month) }, false);
          }}
        />
        {inMonth.length > 0 ? (
          cardGrid(inMonth)
        ) : (
          <EmptyState icon={CalendarX2} title={labels.emptyMonth} />
        )}
      </div>
    );
  } else if (scope === "past") {
    body = past.length > 0 ? grid(past) : joinCards.past;
  } else if (upcoming.length > 0) {
    body = grid(upcoming);
  } else if (past.length > 0) {
    // Nothing coming up: say so briefly and show what the club has done instead.
    body = (
      <div className="space-y-10">
        <EmptyState
          icon={CalendarX2}
          title={labels.emptyUpcoming}
          description={labels.emptyUpcomingHint}
          className="py-8"
        >
          {/* Hidden for members by CSS before paint (no layout shift), see role-hint.ts. */}
          <Button asChild className="hide-for-members">
            <Link href="/join">{labels.emptyUpcomingCta}</Link>
          </Button>
        </EmptyState>
        <div>
          <h2 className="mb-5 text-2xl font-extrabold">{labels.pastTitle}</h2>
          <YearGroups items={past.slice(0, 6)} labels={labels.years} render={cardGrid} as="h3" />
          {past.length > 6 && (
            <Button asChild variant="outline" className="mt-6">
              <a href="?tab=past" onClick={set({ tab: "past" })}>
                {labels.allPast} <ArrowRight />
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  } else {
    body = joinCards.upcoming;
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-full bg-muted p-1">
          <a
            href="?"
            onClick={set({ view: undefined, month: undefined })}
            className={tabClass(view === "list")}
            aria-current={view === "list" ? "page" : undefined}
          >
            <List className="size-4" aria-hidden="true" /> {labels.listView}
          </a>
          <a
            href="?view=calendar"
            onClick={set({ view: "calendar", tab: undefined, year: undefined })}
            className={tabClass(view === "calendar")}
            aria-current={view === "calendar" ? "page" : undefined}
          >
            <CalendarDays className="size-4" aria-hidden="true" /> {labels.calendarView}
          </a>
        </div>
        {view === "list" && (
          <div className="inline-flex w-fit rounded-full bg-muted p-1">
            <a
              href="?"
              onClick={set({ tab: undefined })}
              className={tabClass(scope === "upcoming")}
              aria-current={scope === "upcoming" ? "page" : undefined}
            >
              {labels.upcoming}
            </a>
            <a
              href="?tab=past"
              onClick={set({ tab: "past" })}
              className={tabClass(scope === "past")}
              aria-current={scope === "past" ? "page" : undefined}
            >
              {labels.past}
            </a>
          </div>
        )}
      </div>
      {view === "list" && (
        <YearChips
          years={years}
          active={year}
          labels={labels.years}
          href={(y) => {
            const p = new URLSearchParams(query);
            if (y) p.set("year", y);
            else p.delete("year");
            return p.size ? `?${p}` : "?";
          }}
          onPick={(y) => set({ year: y || undefined })}
        />
      )}
      {body}
    </>
  );
}
