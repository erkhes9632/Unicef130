/**
 * School years (Mongolia): 1 September – 31 August, in Ulaanbaatar time (UTC+8, no DST).
 * Stored as "2025-2026" (hyphen), shown as "2025–2026" (en dash). Pure functions shared by the
 * server, the browser and SQL (`schoolYearSql`), unit-tested in tests/school-year.test.ts.
 * The SQL forms live in `school-year-sql.ts` (server only, keeps drizzle out of the browser).
 */
import { UB_OFFSET_MS } from "@/lib/dates/ub-time";

const PATTERN = /^(\d{4})-(\d{4})$/;

/** "2025-2026" with consecutive years. */
export function isSchoolYear(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = PATTERN.exec(value);
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

const label = (start: number) => `${start}-${start + 1}`;

/** First calendar year of a school year: "2025-2026" → 2025. */
export const startYear = (year: string) => Number(year.slice(0, 4));

/** The school year a moment belongs to (Ulaanbaatar date): 2026-09-01 00:00 UB → "2026-2027". */
export function schoolYearOf(date: Date | number | string): string {
  const ub = new Date(new Date(date).getTime() + UB_OFFSET_MS);
  const y = ub.getUTCFullYear();
  return label(ub.getUTCMonth() >= 8 ? y : y - 1);
}

/** The school year of a calendar day "YYYY-MM-DD" (album dates; already a UB date). */
export function schoolYearOfDay(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  return label(m >= 9 ? y : y - 1);
}

export const nextSchoolYear = (year: string) => label(startYear(year) + 1);
export const previousSchoolYear = (year: string) => label(startYear(year) - 1);

/** [from, to) in UTC ms: 1 September 00:00 UB to the next 1 September 00:00 UB. */
export function schoolYearRange(year: string) {
  const y = startYear(year);
  return { from: Date.UTC(y, 8, 1) - UB_OFFSET_MS, to: Date.UTC(y + 1, 8, 1) - UB_OFFSET_MS };
}

/** [from, to) as calendar days ("YYYY-09-01", next "YYYY-09-01") for text date columns. */
export function schoolYearDays(year: string) {
  const y = startYear(year);
  return { from: `${y}-09-01`, to: `${y + 1}-09-01` };
}

/** "2025-2026" → "2025–2026" */
export const displayYear = (year: string) => year.replace("-", "–");

/**
 * The club's current school year: the admin's setting («Одоогийн хичээлийн жил», e.g. to start
 * the new year a few days early) when valid, otherwise the year of today.
 */
export function currentSchoolYear(setting: string | null | undefined, now: number = Date.now()) {
  return isSchoolYear(setting) ? setting : schoolYearOf(now);
}

/** Distinct valid years, newest first. */
export function sortYearsDesc(years: Iterable<string | null | undefined>): string[] {
  return [...new Set([...years].filter(isSchoolYear))].sort((a, b) => b.localeCompare(a));
}

/**
 * Splits a list that is already sorted newest first into consecutive runs per school year
 * (headings of the grouped public lists). Pure: one pass, no re-sorting.
 */
export function groupByYear<T>(items: readonly T[], yearOf: (item: T) => string) {
  const groups: { year: string; items: T[] }[] = [];
  for (const item of items) {
    const year = yearOf(item);
    const last = groups.at(-1);
    if (last?.year === year) last.items.push(item);
    else groups.push({ year, items: [item] });
  }
  return groups;
}
