/**
 * Periods of the statistics page (pure, shared by the API route, the CSV and the browser).
 * Times are UTC ms; days and months are Ulaanbaatar dates (UTC+8).
 */
import { UB_OFFSET_MS } from "@/lib/dates/ub-time";
import { schoolYearOf, schoolYearRange } from "@/lib/school-year";

export const PERIODS = ["24h", "7d", "30d", "90d", "year"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export type Period = {
  key: PeriodKey;
  from: number;
  to: number;
  /** The same length right before `from` (for ▲/▼ changes). */
  prevFrom: number;
  prevTo: number;
  /** Chart buckets: hours for 24 h, days otherwise. */
  bucket: "hour" | "day";
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function parsePeriod(value: unknown): PeriodKey {
  return PERIODS.includes(value as PeriodKey) ? (value as PeriodKey) : "30d";
}

/** Start of the school year (1 September, Ulaanbaatar) that contains `now`. */
export function schoolYearStart(now: number) {
  return schoolYearRange(schoolYearOf(now)).from;
}

export function periodRange(key: PeriodKey, now: number): Period {
  const length =
    key === "24h"
      ? DAY
      : key === "7d"
        ? 7 * DAY
        : key === "30d"
          ? 30 * DAY
          : key === "90d"
            ? 90 * DAY
            : now - schoolYearStart(now);
  const from = now - length;
  return {
    key,
    from,
    to: now,
    prevFrom: from - length,
    prevTo: from,
    bucket: key === "24h" ? "hour" : "day",
  };
}

/** "2026-11-21" (UB date) or "2026-11-21T14" (UB hour) for a UTC ms time. */
export function bucketKey(ms: number, bucket: "hour" | "day") {
  const iso = new Date(ms + UB_OFFSET_MS).toISOString();
  return bucket === "hour" ? iso.slice(0, 13) : iso.slice(0, 10);
}

/** Every bucket key of [from, to), so charts show zeros instead of gaps. */
export function bucketKeys(from: number, to: number, bucket: "hour" | "day") {
  const step = bucket === "hour" ? HOUR : DAY;
  const keys: string[] = [];
  for (let t = from; t < to; t += step) {
    const k = bucketKey(t, bucket);
    if (keys.at(-1) !== k) keys.push(k);
  }
  const last = bucketKey(to - 1, bucket);
  if (keys.at(-1) !== last) keys.push(last);
  return keys;
}

/** Change in % from `prev` to `cur` (null when there is nothing to compare with). */
export function changePct(cur: number, prev: number) {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}
