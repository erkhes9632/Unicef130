/**
 * Y-axis for counts (people, visits, hours): whole-number steps of 1, 2, 5 × 10^n, at most
 * `maxTicks` lines, starting at 0 — never "3, 5" or half a person.
 */
export function countTicks(maxValue: number, maxTicks = 6): { max: number; ticks: number[] } {
  const v = Math.max(1, Math.ceil(maxValue));
  let step = 1;
  for (let p = 1; ; p *= 10) {
    const s = [1, 2, 5].map((m) => m * p).find((c) => Math.ceil(v / c) + 1 <= maxTicks);
    if (s) {
      step = s;
      break;
    }
  }
  const max = Math.ceil(v / step) * step;
  return { max, ticks: Array.from({ length: max / step + 1 }, (_, i) => i * step) };
}

/** A running total from its first non-zero point on (no weeks of flat zero before it). */
export function fromFirstNonZero<T extends { value: number }>(points: T[]): T[] {
  const first = points.findIndex((p) => p.value > 0);
  return first <= 0 ? points : points.slice(first);
}
