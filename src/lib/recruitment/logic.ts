/**
 * Recruitment rules — pure functions (no I/O), shared by the join form, the server action, the
 * admin screens and the tests.
 */
import type { ApplicationStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

type PeriodWindow = { opensAt: Date; closesAt: Date };
type PeriodPhase = "upcoming" | "open" | "closed";

/** Open means `opensAt <= now < closesAt` (instants; the admin enters them in Ulaanbaatar time). */
export function periodPhase(period: PeriodWindow, now: number = Date.now()): PeriodPhase {
  if (now < period.opensAt.getTime()) return "upcoming";
  return now < period.closesAt.getTime() ? "open" : "closed";
}

/** The period that is open right now, if any (periods never overlap). */
export function findOpenPeriod<T extends PeriodWindow>(periods: T[], now: number = Date.now()) {
  return periods.find((p) => periodPhase(p, now) === "open") ?? null;
}

/** The next period that has not opened yet. */
export function findNextPeriod<T extends PeriodWindow>(periods: T[], now: number = Date.now()) {
  return (
    periods
      .filter((p) => periodPhase(p, now) === "upcoming")
      .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0] ?? null
  );
}

export function periodsOverlap(a: PeriodWindow, b: PeriodWindow) {
  return a.opensAt.getTime() < b.closesAt.getTime() && b.opensAt.getTime() < a.closesAt.getTime();
}

/** Statuses that occupy a place when a period has a capacity. */
export const countedStatuses: readonly ApplicationStatus[] = [
  "new",
  "reviewing",
  "interview",
  "accepted",
];

export type Intake = "accept" | "waitlist" | "full";

/** What happens to the next application given the capacity and how many places are taken. */
export function intakeFor(
  period: { capacity: number | null; whenFull: "close" | "waitlist" },
  taken: number,
): Intake {
  if (period.capacity === null || taken < period.capacity) return "accept";
  return period.whenFull === "waitlist" ? "waitlist" : "full";
}

/** "6–12 × а–г" style class list for the admin form. */
export function buildClassList(fromGrade: number, toGrade: number, sections: string[]) {
  const out: string[] = [];
  for (let g = fromGrade; g <= toGrade; g++) for (const s of sections) out.push(`${g}${s}`);
  return out;
}

/** "6а, 6Б 7 в" → ["6А", "6Б", "7В"] (unique, upper-cased, in the order typed). */
export function parseClassList(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[\s,;]+/)) {
    const c = normalizeClass(raw);
    if (/^\d{1,2}\p{L}{0,2}$/u.test(c)) seen.add(c);
  }
  return [...seen];
}

export function normalizeClass(value: string) {
  return value.replace(/[\s-]/g, "").toLocaleUpperCase("mn");
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

/** Mongolian names are written in Cyrillic: at least two parts ("Овог Нэр" or "О.Нэр"). */
export function isCyrillicFullName(value: string) {
  const v = value.trim();
  if (v.length < 3 || v.length > 60) return false;
  if (!/^[\p{Script=Cyrillic}][\p{Script=Cyrillic}\s.\-]*[\p{Script=Cyrillic}]$/u.test(v))
    return false;
  return v.split(/[\s.]+/).filter(Boolean).length >= 2;
}

/** Mongolian mobile number: 8 digits starting with 6–9 (optional +976 prefix, spaces, dashes). */
export function normalizeMnPhone(value: string): string | null {
  const digits = value.replace(/[\s\-()]/g, "").replace(/^\+?976(?=\d{8}$)/, "");
  return /^[6-9]\d{7}$/.test(digits) ? digits : null;
}

/** Free text may not carry links (a common spam payload). */
export function containsUrl(text: string) {
  return /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|mn|ru|io|xyz|info|biz|top|site|online|link|ly)\b)/i.test(
    text,
  );
}

// ---------------------------------------------------------------------------
// The applicant's view of /join
// ---------------------------------------------------------------------------

export type PublicStatus = "pending" | "accepted" | "rejected" | "waitlist";

/** What the applicant sees. Internal steps (reviewing, interview) read as "pending". */
export function publicStatus(status: ApplicationStatus): PublicStatus {
  if (status === "accepted" || status === "rejected" || status === "waitlist") return status;
  return "pending";
}

type JoinView =
  /** Already a member (or an admin): nothing to apply for. */
  | "member"
  /** An admin blocked new applications from this account. */
  | "blocked"
  /** Has an application for the open period → its status. */
  | "status"
  /** The open period has room (or a waitlist) and no application from this account yet. */
  | "form"
  /** No open period (or it is full): closed page, plus the latest status if there is one. */
  | "closed";

/**
 * Decides what a signed-in account sees on /join. One application per account per period: a
 * rejected applicant can apply again only when a new period opens.
 */
export function joinView(input: {
  role: "admin" | "member" | null;
  applyBlocked: boolean;
  /** The period open right now and whether it still takes applications. */
  open: { id: string; intake: Intake } | null;
  /** Period ids this account has applied for. */
  appliedPeriodIds: readonly (string | null)[];
}): JoinView {
  if (input.role) return "member";
  if (input.open && input.appliedPeriodIds.includes(input.open.id)) return "status";
  if (input.applyBlocked) return "blocked";
  if (input.open && input.open.intake !== "full") return "form";
  return "closed";
}

// ---------------------------------------------------------------------------
// Privacy: rejected applications are deleted after a while
// ---------------------------------------------------------------------------

export const DEFAULT_REJECTED_RETENTION_DAYS = 90;

/**
 * Rejected applications are kept for `days` after their period closes, then deleted (personal
 * data of minors). Returns the instant before which a period must have closed for its rejected
 * applications to be deleted now.
 */
export function retentionCutoff(days: number, now: number = Date.now()) {
  const safeDays =
    Number.isFinite(days) && days >= 1 ? Math.floor(days) : DEFAULT_REJECTED_RETENTION_DAYS;
  return new Date(now - safeDays * 86_400_000);
}

/** Given name only ("Батын Анужин" → "Анужин") for the /join greeting. */
export function givenName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/[\s.]+/)
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Member list style: "Батын Анужин" → "Б.Анужин"; "Б.Анужин" stays. */
export function memberDisplayName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/[\s.]+/)
    .filter(Boolean);
  if (parts.length < 2) return fullName.trim();
  const given = parts[parts.length - 1]!;
  return `${parts[0]![0]!.toLocaleUpperCase("mn")}.${given}`;
}

// ---------------------------------------------------------------------------
// Admin workflow
// ---------------------------------------------------------------------------

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  new: "Шинэ",
  reviewing: "Хянаж байна",
  interview: "Ярилцлага",
  accepted: "Элссэн",
  rejected: "Татгалзсан",
  waitlist: "Хүлээлгийн жагсаалт",
};
