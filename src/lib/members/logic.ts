/**
 * Member area rules — pure functions (hours totals, event sign-up), unit-tested.
 */
import type { SignupStatus } from "@/db/schema";
import { UB_OFFSET_MS } from "@/lib/dates/ub-time";

/** School years start on 1 September (Ulaanbaatar time): 2026-10-01 → "2026-2027". */
export function schoolYearOf(date: Date | number) {
  const ub = new Date(new Date(date).getTime() + UB_OFFSET_MS);
  const y = ub.getUTCFullYear();
  return ub.getUTCMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export type HoursEntry = { schoolYear: string; hours: number };

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

export type SignupEvent = {
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
