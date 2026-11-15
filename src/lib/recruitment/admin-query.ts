import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, applicationStatuses, type ApplicationStatus } from "@/db/schema";

/** Filters of the admin applications list (also used by the CSV export). */
export type ApplicationFilters = {
  period: string;
  /** "" = every status. */
  status: ApplicationStatus | "";
  className: string;
  from: string;
  to: string;
  q: string;
  sort: "new" | "old" | "class";
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function parseApplicationFilters(params: Params): ApplicationFilters {
  const get = (k: string) => {
    const v = params instanceof URLSearchParams ? params.get(k) : params[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const status = get("status");
  const sort = get("sort");
  return {
    period: get("period").slice(0, 64),
    status: (applicationStatuses as readonly string[]).includes(status)
      ? (status as ApplicationStatus)
      : "",
    className: get("class").slice(0, 10),
    from: isDate(get("from")) ? get("from") : "",
    to: isDate(get("to")) ? get("to") : "",
    q: get("q").slice(0, 80),
    sort: sort === "old" || sort === "class" ? sort : "new",
  };
}

/** Case-insensitive match on name / phone / e-mail (JS: SQLite cannot fold Cyrillic). */
export function matchesSearch(
  row: { fullName: string; phone: string; email: string | null },
  q: string,
) {
  if (!q) return true;
  const needle = q.toLocaleLowerCase("mn");
  const digits = q.replace(/\D/g, "");
  return (
    row.fullName.toLocaleLowerCase("mn").includes(needle) ||
    (digits.length >= 3 && row.phone.replace(/\D/g, "").includes(digits)) ||
    (row.email ?? "").toLowerCase().includes(needle.trim())
  );
}

/** Applications matching the filters (dates in Ulaanbaatar time), searched and sorted. */
export async function queryApplications(f: ApplicationFilters) {
  const where: SQL[] = [];
  if (f.period === "none") where.push(isNull(applications.periodId));
  else if (f.period) where.push(eq(applications.periodId, f.period));
  if (f.status) where.push(eq(applications.status, f.status));
  if (f.className) where.push(eq(applications.className, f.className));
  if (f.from) where.push(gte(applications.createdAt, new Date(`${f.from}T00:00:00+08:00`)));
  if (f.to)
    where.push(
      lt(applications.createdAt, new Date(Date.parse(`${f.to}T00:00:00+08:00`) + 86_400_000)),
    );
  const order = {
    new: [desc(applications.createdAt)],
    old: [asc(applications.createdAt)],
    class: [asc(applications.className), asc(applications.fullName)],
  }[f.sort];
  const db = await getDb();
  const rows = await db
    .select()
    .from(applications)
    .where(where.length ? and(...where) : undefined)
    .orderBy(...order)
    .limit(5000);
  return rows.filter((r) => matchesSearch(r, f.q));
}
