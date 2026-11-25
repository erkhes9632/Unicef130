"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/dates/format";
import { monthGrid, todayUb, ubParts } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";

export type CalendarEvent = { id: string; slug: string; title: string; startsAt: string };
type DayEvent = CalendarEvent & { past?: boolean };

/** Month grid (Monday first, Ulaanbaatar time); rendered in the browser on the events page. */
export function MonthCalendar({
  locale,
  year,
  month,
  events,
  labels,
  onShift,
}: {
  locale: "mn" | "en";
  year: number;
  month: number;
  /** `past`: already over (shown muted, with a label for screen readers). */
  events: DayEvent[];
  labels: {
    /** Screen-reader suffix of a past event, e.g. "(болж өнгөрсөн)". */
    pastEvent: string;
    prevMonth: string;
    nextMonth: string;
    today: string;
    /** "# event" / "# events" (# = count). */
    eventsOnDay: { one: string; other: string };
  };
  onShift: (delta: -1 | 1) => void;
}) {
  const weeks = monthGrid(year, month);
  const today = todayUb();
  const byDay = new Map<number, DayEvent[]>();
  for (const e of events) {
    const { day } = ubParts(e.startsAt);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  // Monday 2024-01-01 → weekday labels in the current locale
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    formatDate(locale, Date.UTC(2024, 0, 1 + i, 4), "weekdayShort"),
  );
  const monthLabel = formatDate(locale, Date.UTC(year, month - 1, 15), "monthYear");

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={labels.prevMonth}
          onClick={() => onShift(-1)}
        >
          <ChevronLeft />
        </Button>
        <h2 className="text-center text-lg font-extrabold sm:text-xl" aria-live="polite">
          {monthLabel}
        </h2>
        <Button
          variant="outline"
          size="icon"
          aria-label={labels.nextMonth}
          onClick={() => onShift(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1 text-sm">
        <caption className="sr-only">{monthLabel}</caption>
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th key={d} scope="col" className="pb-1 text-xs font-semibold text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                const dayEvents = day ? (byDay.get(day) ?? []) : [];
                const isToday = day === today.day && month === today.month && year === today.year;
                return (
                  <td
                    key={di}
                    className={cn(
                      "h-14 rounded-xl align-top sm:h-24",
                      day ? "bg-muted/40" : "bg-transparent",
                      dayEvents.length > 0 &&
                        (dayEvents.every((e) => e.past) ? "bg-muted" : "bg-brand-purple-soft"),
                    )}
                  >
                    {day && (
                      <div className="flex h-full flex-col gap-1 p-1 sm:p-1.5">
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                            isToday && "bg-brand-cyan text-brand-ink",
                          )}
                          aria-label={isToday ? labels.today : undefined}
                        >
                          {day}
                        </span>
                        {/* Titles on larger screens, dots on phones */}
                        <ul className="hidden space-y-1 sm:block">
                          {dayEvents.map((e) => (
                            <li key={e.id}>
                              <Link
                                href={`/events/${e.slug}`}
                                className={cn(
                                  "line-clamp-2 rounded-md px-1.5 py-0.5 text-[11px] leading-tight font-semibold",
                                  e.past
                                    ? "bg-surface-2 text-muted-foreground ring-1 ring-border hover:text-foreground"
                                    : "bg-brand-purple text-white hover:bg-brand-purple-strong",
                                )}
                              >
                                {e.title}
                                {e.past && <span className="sr-only"> {labels.pastEvent}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        {dayEvents.length > 0 && (
                          <span
                            role="img"
                            className="flex gap-0.5 sm:hidden"
                            aria-label={(dayEvents.length === 1
                              ? labels.eventsOnDay.one
                              : labels.eventsOnDay.other
                            ).replace("#", String(dayEvents.length))}
                          >
                            {dayEvents.map((e) => (
                              <span
                                key={e.id}
                                className={cn(
                                  "size-1.5 rounded-full",
                                  e.past ? "bg-muted-foreground/50" : "bg-brand-purple",
                                )}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
