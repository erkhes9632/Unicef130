/**
 * SQL literal helpers for the maintenance scripts (the yearly report import builds its SQL
 * with them). Production is changed only by the developer (README → Yearly report).
 */

type SqlValue = string | number | boolean | null | undefined | Date | object;

export function sqlValue(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (v instanceof Date) return String(v.getTime());
  const str = typeof v === "string" ? v : JSON.stringify(v);
  return `'${str.replace(/'/g, "''")}'`;
}

export function insert(table: string, row: Record<string, SqlValue>) {
  const cols = Object.keys(row);
  return `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols
    .map((c) => sqlValue(row[c]))
    .join(", ")});`;
}
