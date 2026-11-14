import type { Locale } from "@/i18n/routing";
import { UB_OFFSET_MS } from "./ub-time";

/**
 * Date formatting in Ulaanbaatar time.
 * The Workers runtime (workerd) ships ICU without Mongolian locale data, so `Intl` silently
 * falls back to English for "mn". Mongolian formats are therefore built by hand here;
 * English uses Intl. Works identically on the server, the client and in tests.
 */
export type DateStyle =
  | "long" // 2026 оны 11-р сарын 5  | November 5, 2026
  | "full" // 2026 оны 11-р сарын 20, Баасан гараг | Friday, November 20, 2026
  | "monthShort" // 11-р сар | Nov
  | "monthYear" // 2026 оны 11-р сар | November 2026
  | "day" // 20
  | "weekdayShort" // Ба | Fri
  | "time"; // 08:30

const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const MN_WEEKDAYS_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

function ub(date: Date | string | number) {
  const d = new Date(new Date(date).getTime() + UB_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hh: String(d.getUTCHours()).padStart(2, "0"),
    mm: String(d.getUTCMinutes()).padStart(2, "0"),
  };
}

const EN_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { year: "numeric", month: "long", day: "numeric" },
  full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  monthShort: { month: "short" },
  monthYear: { year: "numeric", month: "long" },
  day: { day: "numeric" },
  weekdayShort: { weekday: "short" },
  time: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
};

export function formatDate(locale: Locale, date: Date | string | number, style: DateStyle): string {
  if (locale !== "mn") {
    return new Intl.DateTimeFormat("en-US", {
      ...EN_OPTIONS[style],
      timeZone: "Asia/Ulaanbaatar",
    }).format(new Date(date));
  }
  const p = ub(date);
  switch (style) {
    case "long":
      return `${p.year} оны ${p.month}-р сарын ${p.day}`;
    case "full":
      return `${p.year} оны ${p.month}-р сарын ${p.day}, ${MN_WEEKDAYS[p.weekday]} гараг`;
    case "monthShort":
      return `${p.month}-р сар`;
    case "monthYear":
      return `${p.year} оны ${p.month}-р сар`;
    case "day":
      return String(p.day);
    case "weekdayShort":
      return MN_WEEKDAYS_SHORT[p.weekday]!;
    case "time":
      return `${p.hh}:${p.mm}`;
  }
}

/** "08:30–16:00" (same day) or "20/11 08:30 – 21/11 12:00" style fallback for multi-day. */
export function formatTimeRange(locale: Locale, start: Date | string, end?: Date | string | null) {
  const s = formatDate(locale, start, "time");
  if (!end) return s;
  const a = ub(start);
  const b = ub(end);
  if (a.year === b.year && a.month === b.month && a.day === b.day) {
    return `${s}–${formatDate(locale, end, "time")}`;
  }
  return `${formatDate(locale, start, "long")} ${s} – ${formatDate(locale, end, "long")} ${formatDate(locale, end, "time")}`;
}

/** Plain date (YYYY-MM-DD) treated as noon in UB, so it never shifts a day. */
export function fromIsoDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00+08:00`);
}

/** Thousands separator that is consistent across runtimes. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Date-only range for all-day events (no times):
 * mn "2025 оны 11-р сарын 17 – 12-р сарын 19", en "November 17 – December 19, 2025".
 */
export function formatDateRange(locale: Locale, start: Date | string, end?: Date | string | null) {
  const a = ub(start);
  const b = end ? ub(end) : null;
  if (!b || (a.year === b.year && a.month === b.month && a.day === b.day)) {
    return formatDate(locale, start, "long");
  }
  if (locale === "mn") {
    return a.year === b.year
      ? `${a.year} оны ${a.month}-р сарын ${a.day} – ${b.month}-р сарын ${b.day}`
      : `${formatDate(locale, start, "long")} – ${formatDate(locale, end!, "long")}`;
  }
  const md = (d: Date | string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "Asia/Ulaanbaatar",
    }).format(new Date(d));
  return a.year === b.year
    ? `${md(start)} – ${md(end!)}, ${b.year}`
    : `${formatDate(locale, start, "long")} – ${formatDate(locale, end!, "long")}`;
}

/** "855,000₮" */
export function formatMnt(value: number) {
  return `${formatNumber(value)}₮`;
}
