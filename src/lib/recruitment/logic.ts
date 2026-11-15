/**
 * Recruitment rules — pure functions (no I/O), shared by the join form, the server action, the
 * admin screens and the tests.
 */
import type { ApplicationStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type PeriodWindow = { opensAt: Date; closesAt: Date };
export type PeriodPhase = "upcoming" | "open" | "closed";

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
// Spam scoring
// ---------------------------------------------------------------------------

export const MIN_FILL_MS = 4_000;
export const SPAM_THRESHOLD = 50;

export type SpamSignals = {
  /** Time between rendering the form and submitting it. */
  fillMs: number;
  fullName: string;
  reason: string;
  /** Other applications in this period with exactly the same reason text. */
  sameReasonCount: number;
  /** Other applications from the same network address in the last 24 hours. */
  sameIpRecent: number;
};

const VOWELS = /[аэиоуөүяеёюыaeiouy]/giu;

/** Keyboard mashing: almost no vowels, one character repeated, or very few distinct letters. */
export function looksLikeGibberish(text: string) {
  const letters = text.toLocaleLowerCase("mn").replace(/[^\p{L}]/gu, "");
  if (letters.length < 6) return false;
  if (/(.)\1{4,}/u.test(letters)) return true;
  const vowelRatio = (letters.match(VOWELS)?.length ?? 0) / letters.length;
  if (vowelRatio < 0.15) return true;
  return letters.length >= 12 && new Set(letters).size <= 4;
}

/** Combines the signals into a score (0–100+) with the reasons; ≥ SPAM_THRESHOLD is "suspicious". */
export function spamScore(s: SpamSignals): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;
  const add = (points: number, flag: string) => {
    score += points;
    flags.push(flag);
  };
  if (s.fillMs < 10_000) add(30, "fast_fill");
  if (s.sameReasonCount > 0) add(40, "repeated_text");
  if (looksLikeGibberish(s.reason)) add(35, "gibberish_text");
  if (looksLikeGibberish(s.fullName)) add(35, "gibberish_name");
  if (s.sameIpRecent >= 3) add(20 + Math.min(30, (s.sameIpRecent - 3) * 10), "many_from_ip");
  const words = s.reason.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 4 && new Set(words.map((w) => w.toLocaleLowerCase("mn"))).size <= 2)
    add(30, "repeated_words");
  return { score, flags };
}

export const spamFlagLabels: Record<string, string> = {
  fast_fill: "Хэт хурдан бөглөсөн",
  repeated_text: "Ижил тексттэй өөр өргөдөл байна",
  gibberish_text: "Утгагүй текст",
  gibberish_name: "Утгагүй нэр",
  many_from_ip: "Нэг сүлжээнээс олон өргөдөл",
  repeated_words: "Давтагдсан үгс",
  marked_by_admin: "Админ спам гэж тэмдэглэсэн",
};

// ---------------------------------------------------------------------------
// Tracking codes and the public status page
// ---------------------------------------------------------------------------

/** No 0/O, 1/I/L: easy to read aloud and type. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** e.g. "UC-7K3M" */
export function generateTrackingCode(random: () => number = Math.random) {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `UC-${code}`;
}

/** Accepts "uc-7k3m", "UC7K3M", " 7k3m " → "UC-7K3M"; null when it cannot be a code. */
export function normalizeTrackingCode(input: string): string | null {
  const v = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^UC/, "");
  return v.length === 4 && [...v].every((c) => CODE_ALPHABET.includes(c)) ? `UC-${v}` : null;
}

export type PublicStatus = "received" | "interview" | "accepted" | "waitlist" | "declined";

/** What the applicant sees. Internal states (reviewing, spam) are not revealed. */
export function publicStatus(status: ApplicationStatus): PublicStatus {
  switch (status) {
    case "interview":
      return "interview";
    case "accepted":
      return "accepted";
    case "waitlist":
      return "waitlist";
    case "rejected":
      return "declined";
    default:
      return "received";
  }
}

/** Given name only ("Батын Анужин" → "Анужин") for the status page greeting. */
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
  spam: "Спам / сэжигтэй",
};
