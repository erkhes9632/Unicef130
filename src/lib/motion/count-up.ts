/**
 * Number parsing for animated counters. Stats are free text from admin settings ("855,000₮",
 * "101K+", "2 489", "4.5"), so the counter animates only the number inside and keeps the rest.
 * A value with more than one number, or one that does not survive a parse → format round trip is left static (returns null).
 */
export type ParsedStat = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  /** Thousands separator used in the original text ("" when none). */
  group: string;
};

export function parseStat(value: string): ParsedStat | null {
  const m = /\d(?:[\d,.  ]*\d)?/.exec(value);
  if (!m) return null;
  const raw = m[0];
  // Two numbers ("2025–2026") → leave it alone; only one number is animated.
  if (/\d/.test(value.slice(m.index + raw.length))) return null;
  let intPart = raw;
  let frac = "";
  const dot = raw.lastIndexOf(".");
  // "4.5" / "1,234.56" → decimal point; "855.000" (dot as thousands separator) stays an integer.
  if (dot >= 0 && (raw.includes(",") || raw.length - dot - 1 !== 3)) {
    intPart = raw.slice(0, dot);
    frac = raw.slice(dot + 1);
  }
  const group = /[,.  ]/.exec(intPart)?.[0] ?? "";
  const parsed: ParsedStat = {
    prefix: value.slice(0, m.index),
    suffix: value.slice(m.index + raw.length),
    target: Number(`${intPart.replace(/\D/g, "")}${frac ? `.${frac}` : ""}`),
    decimals: frac.length,
    group,
  };
  if (!Number.isFinite(parsed.target) || formatStat(parsed, parsed.target) !== value) return null;
  return parsed;
}

export function formatStat(p: ParsedStat, n: number): string {
  const [int = "0", frac] = Math.max(0, n).toFixed(p.decimals).split(".");
  const grouped = p.group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, p.group) : int;
  return `${p.prefix}${grouped}${frac ? `.${frac}` : ""}${p.suffix}`;
}

/** Ease-out cubic: fast start, gentle landing. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}
