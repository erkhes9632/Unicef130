/**
 * Member area rules — pure functions (hours totals, event sign-up), unit-tested.
 */
import type { SignupStatus } from "@/db/schema";
import { isSchoolYear, schoolYearOf, sortYearsDesc } from "@/lib/school-year";

type HoursEntry = { schoolYear: string; hours: number };

/**
 * Yearly totals, newest year first: logged entries plus the imported report total
 * (`members.volunteer_hours` for `members.school_year`).
 */
export function yearTotals(
  entries: readonly HoursEntry[],
  imported: { schoolYear: string | null; hours: number | null },
): { schoolYear: string; hours: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.schoolYear, (totals.get(e.schoolYear) ?? 0) + e.hours);
  if (imported.schoolYear && imported.hours)
    totals.set(imported.schoolYear, (totals.get(imported.schoolYear) ?? 0) + imported.hours);
  return [...totals.entries()]
    .map(([schoolYear, hours]) => ({ schoolYear, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
}

/** Progress to the "идэвхтэй гишүүн" threshold, 0–100 (null when no threshold is set). */
export function activeProgress(hours: number, threshold: number | null) {
  if (!threshold || threshold <= 0) return null;
  return Math.min(100, Math.round((hours / threshold) * 100));
}

type SignupEvent = {
  signupEnabled: boolean;
  signupCapacity: number | null;
  signupDeadline: Date | null;
  startsAt: Date;
};

/** Sign-up is open until the deadline (or until the event starts when there is none). */
export function signupOpen(event: SignupEvent, now: number = Date.now()) {
  if (!event.signupEnabled) return false;
  const closes = (event.signupDeadline ?? event.startsAt).getTime();
  return now < closes;
}

/** Statuses that hold one of the event's places. */
export const placeHolding: readonly SignupStatus[] = ["registered", "attended"];

/**
 * What a sign-up becomes: a place while there is room, otherwise the waitlist. `taken` counts
 * the other members' place-holding sign-ups.
 */
export function signupStatusFor(event: SignupEvent, taken: number): "registered" | "waitlist" {
  return event.signupCapacity === null || taken < event.signupCapacity ? "registered" : "waitlist";
}

/** The word a member types to confirm deleting their own account (either language). */
export const DELETE_CONFIRM_WORDS = ["УСТГАХ", "DELETE"];

/**
 * Suggested hours for attending an event: its length rounded to half hours (0.5–12). Null when
 * the length is unknown (all-day or no end time) — the admin types the hours.
 */
export function suggestedEventHours(event: {
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
}) {
  if (event.allDay || !event.endsAt) return null;
  const hours = (event.endsAt.getTime() - event.startsAt.getTime()) / 3_600_000;
  if (!(hours > 0)) return null;
  return Math.min(12, Math.max(0.5, Math.round(hours * 2) / 2));
}

/** One entry's hours: more than 0, at most 24, in quarter hours. */
export function parseHours(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 24) return null;
  return Math.round(n * 4) / 4;
}

/**
 * Each member's total for a school year: logged entries of that year plus the imported report
 * total when the member's own school year matches.
 */
export function memberYearTotals(
  members: readonly { id: string; schoolYear: string | null; volunteerHours: number | null }[],
  entries: readonly { memberId: string | null; schoolYear: string; hours: number }[],
  year: string,
): Map<string, { logged: number; imported: number; total: number }> {
  const out = new Map<string, { logged: number; imported: number; total: number }>();
  for (const m of members) {
    const imported = m.schoolYear === year ? (m.volunteerHours ?? 0) : 0;
    out.set(m.id, { logged: 0, imported, total: imported });
  }
  for (const e of entries) {
    if (e.schoolYear !== year || !e.memberId) continue;
    const row = out.get(e.memberId);
    if (!row) continue;
    row.logged = Math.round((row.logged + e.hours) * 100) / 100;
    row.total = Math.round((row.imported + row.logged) * 100) / 100;
  }
  return out;
}

/** "Идэвхтэй гишүүн": the yearly total reaches the admin's threshold (none set → nobody). */
export function isActiveMember(total: number, threshold: number | null) {
  return threshold !== null && threshold > 0 && total >= threshold;
}

/** Recent school years for selects: the current one first, then those that appear in data. */
export function schoolYearOptions(
  known: readonly (string | null)[],
  now: number = Date.now(),
  current: string = schoolYearOf(now),
) {
  return sortYearsDesc([current, ...known.filter(isSchoolYear)]);
}

/**
 * Which team the public members / About pages show: the current year's, or — while it has none
 * yet — the latest earlier year that has one (`waiting` = the current year, for "… оны баг
 * удахгүй нэмэгдэнэ"). `requested` (an earlier year's own page) is shown on top instead, null
 * when that year has no team. Never empty when any year has a team. `teams` is newest first.
 */
export function pickShownTeam<T extends { year: string }>(
  teams: readonly T[],
  current: string,
  requested?: string,
) {
  const exact = teams.find((t) => t.year === (requested ?? current));
  const shown =
    exact ?? (requested ? undefined : (teams.find((t) => t.year < current) ?? teams[0]));
  return {
    shown: shown ?? null,
    waiting: !requested && !exact && shown ? current : null,
    /** The years below the shown one, newest first («Өмнөх жилүүд»). */
    earlier: shown ? teams.filter((t) => t.year < shown.year) : [],
  };
}
