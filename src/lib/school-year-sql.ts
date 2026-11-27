import "server-only";
import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import { UB_OFFSET_MS } from "@/lib/dates/ub-time";

/**
 * SQL for the school year of a millisecond timestamp column (UB time), e.g. "2025-2026". Used to
 * group and count in D1; filters use `schoolYearRange` on the indexed column instead.
 */
export function schoolYearSql(column: AnyColumn | SQL): SQL<string> {
  const ub = sql`((${column} + ${sql.raw(String(UB_OFFSET_MS))}) / 1000)`;
  const y = sql`cast(strftime('%Y', ${ub}, 'unixepoch') as integer)`;
  const start = sql`(${y} - (cast(strftime('%m', ${ub}, 'unixepoch') as integer) < 9))`;
  return sql<string>`(${start} || '-' || (${start} + 1))`;
}

/** SQL for the school year of a "YYYY-MM-DD" text column. */
export function schoolYearDaySql(column: AnyColumn | SQL): SQL<string> {
  const y = sql`cast(substr(${column}, 1, 4) as integer)`;
  const start = sql`(${y} - (cast(substr(${column}, 6, 2) as integer) < 9))`;
  return sql<string>`(${start} || '-' || (${start} + 1))`;
}
