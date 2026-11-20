/** Pure helpers for the audit trail (no database access). */

export type Changes = Record<string, [unknown, unknown]>;

/** Short reference to a record in log summaries (never a person's name). */
export const shortId = (id: string) => id.slice(0, 8);

/**
 * Fields that differ between two versions of a record, as `{ field: [before, after] }`.
 * Long values (text bodies, JSON) are reduced to "changed" so the log stays small.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: readonly (keyof T & string)[],
  /** Personal fields (a member's name, class…): logged as changed, values left out. */
  personal: readonly (keyof T & string)[] = [],
): Changes | undefined {
  const out: Changes = {};
  const show = (v: unknown) => {
    if (v instanceof Date) return v.toISOString();
    if (v === null || v === undefined || typeof v === "boolean" || typeof v === "number") return v;
    if (typeof v === "string") return v.length > 80 ? `${v.slice(0, 77)}…` : v;
    return "…";
  };
  for (const f of fields) {
    if (!(f in after)) continue;
    const a = before[f];
    const b = after[f];
    const same =
      a instanceof Date && b instanceof Date
        ? a.getTime() === b.getTime()
        : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (!same) out[f] = personal.includes(f) ? ["…", "…"] : [show(a), show(b)];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
