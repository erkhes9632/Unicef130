/** Ulaanbaatar is UTC+8 all year (no DST), so calendar math can use a fixed offset. */
export const UB_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Calendar parts of a timestamp in Ulaanbaatar time. */
export function ubParts(date: Date | string | number) {
  const d = new Date(new Date(date).getTime() + UB_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Parses "YYYY-MM" (falls back to the current UB month). */
export function parseMonth(value: unknown, now = Date.now()) {
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return { year: y!, month: m! };
  }
  const { year, month } = ubParts(now);
  return { year, month };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** Weeks (Monday-first) covering the month; days outside the month are null. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Today's date in Ulaanbaatar (request time). */
export function todayUb() {
  return ubParts(Date.now());
}
