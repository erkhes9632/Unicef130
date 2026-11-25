import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { users } from "@/db/schema";
import { MIN_SEARCH } from "@/lib/admin/list-limits";
import { wordPrefix } from "@/lib/admin/list-query";

/** /admin/users filters. */
export const userFilterOptions = [
  { value: "", label: "Бүгд" },
  { value: "admin", label: "Админ" },
  { value: "member", label: "Гишүүн" },
  { value: "applicant", label: "Өргөдөл гаргагч" },
  { value: "noname", label: "Нэр оруулаагүй" },
  { value: "banned", label: "Идэвхгүй" },
] as const;
type UserRoleFilter = (typeof userFilterOptions)[number]["value"];

type UserFilters = { q: string; role: UserRoleFilter };

type Params = Record<string, string | string[] | undefined>;

export function parseUserFilters(params: Params): UserFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim() : "");
  const role = get("role");
  const q = get("q").slice(0, 80);
  return {
    q: [...q].length >= MIN_SEARCH ? q : "",
    role: userFilterOptions.some((o) => o.value === role) ? (role as UserRoleFilter) : "",
  };
}

/** SQL condition for the filters (name / e-mail word prefix, role, missing name, banned). */
export function userFilterWhere(f: UserFilters): SQL | undefined {
  const where: SQL[] = [];
  if (f.role === "admin") where.push(eq(users.role, "admin"));
  if (f.role === "member") where.push(eq(users.role, "member"));
  if (f.role === "applicant") where.push(isNull(users.role));
  if (f.role === "noname") where.push(sql`trim(${users.name}) = ''`);
  if (f.role === "banned") where.push(eq(users.banned, true));
  if (f.q) where.push(wordPrefix([users.name, users.email], f.q));
  return where.length ? and(...where) : undefined;
}
