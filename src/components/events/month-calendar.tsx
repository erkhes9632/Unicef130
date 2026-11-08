import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { EventItem } from "@/lib/data/events";
import { formatDate } from "@/lib/dates/format";
import { monthGrid, monthKey, shiftMonth, todayUb, ubParts } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";

/** Server-rendered month grid (Monday first, Ulaanbaatar time). Navigation via ?month=. */
export async function MonthCalendar({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: EventItem[];
}) {
  const t = await getTranslations("Events");
  const locale = await getLocale();
  const weeks = monthGrid(year, month);
  const today = todayUb();
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const byDay = new Map<number, EventItem[]>();
  for (const e of events) {
    const { day } = ubParts(e.startsAt);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  // Monday 2024-01-01 → weekday labels in the current locale
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    formatDate(locale, Date.UTC(2024, 0, 1 + i, 4), "weekdayShort"),
  );
  const monthLabel = formatDate(locale, Date.UTC(year, month - 1, 15), "monthYear");
  const href = (y: number, m: number) => ({
    pathname: "/events",
    query: { view: "calendar", month: monthKey(y, m) },
  });

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t("prevMonth")}>
          <Link href={href(prev.year, prev.month)}>
            <ChevronLeft />
          </Link>
        </Button>
        <h2 className="text-center text-lg font-extrabold capitalize sm:text-xl" aria-live="polite">
          {monthLabel}
        </h2>
        <Button asChild variant="outline" size="icon" aria-label={t("nextMonth")}>
          <Link href={href(next.year, next.month)}>
            <ChevronRight />
          </Link>
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
                      dayEvents.length > 0 && "bg-brand-purple-soft",
                    )}
                  >
                    {day && (
                      <div className="flex h-full flex-col gap-1 p-1 sm:p-1.5">
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                            isToday && "bg-brand-cyan text-brand-night",
                          )}
                          aria-label={isToday ? t("today") : undefined}
                        >
                          {day}
                        </span>
                        {/* Titles on larger screens, dots on phones */}
                        <ul className="hidden space-y-1 sm:block">
                          {dayEvents.map((e) => (
                            <li key={e.id}>
                              <Link
                                href={`/events/${e.slug}`}
                                className="line-clamp-2 rounded-md bg-brand-purple px-1.5 py-0.5 text-[11px] leading-tight font-semibold text-white hover:bg-brand-purple-strong"
                              >
                                {e.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        {dayEvents.length > 0 && (
                          <span
                            className="flex gap-0.5 sm:hidden"
                            aria-label={t("eventsOnDay", { count: dayEvents.length })}
                          >
                            {dayEvents.map((e) => (
                              <span key={e.id} className="size-1.5 rounded-full bg-brand-purple" />
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
