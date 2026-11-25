import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, applicationStatuses, type ApplicationStatus } from "@/db/schema";
import { MIN_SEARCH } from "@/lib/admin/list-limits";
import { wordPrefix } from "@/lib/admin/list-query";

/** Filters of the admin applications list (also used by the CSV export). */
type ApplicationFilters = {
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
    q: [...get("q")].length >= MIN_SEARCH ? get("q").slice(0, 80) : "",
    sort: sort === "old" || sort === "class" ? sort : "new",
  };
}

/**
 * SQL condition for the filters (dates in Ulaanbaatar time). Search: a word of the name or the
 * e-mail starts with the term (Cyrillic in any case), or the phone contains 3+ typed digits.
 */
export function applicationWhere(f: ApplicationFilters): SQL | undefined {
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
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    const text = wordPrefix([applications.fullName, applications.email], f.q);
    where.push(
      digits.length >= 3
        ? or(
            text,
            sql`replace(replace(${applications.phone}, ' ', ''), '-', '') LIKE ${`%${digits}%`}`,
          )!
        : text,
    );
  }
  return where.length ? and(...where) : undefined;
}

export const applicationOrder = (f: ApplicationFilters) =>
  ({
    new: [desc(applications.createdAt)],
    old: [asc(applications.createdAt)],
    class: [asc(applications.className), asc(applications.fullName)],
  })[f.sort];

/** Every application matching the filters (CSV export). */
export async function queryApplications(f: ApplicationFilters) {
  const db = await getDb();
  return db
    .select()
    .from(applications)
    .where(applicationWhere(f))
    .orderBy(...applicationOrder(f))
    .limit(5000);
}
