import type { ApplicationStatus } from "@/db/schema";
import type { AppRole } from "@/lib/auth/roles";

/** /admin/users filters (pure, unit-tested). */
export const userFilterOptions = [
  { value: "", label: "Бүгд" },
  { value: "admin", label: "Админ" },
  { value: "member", label: "Гишүүн" },
  { value: "applicant", label: "Өргөдөл гаргагч" },
  { value: "banned", label: "Идэвхгүй" },
] as const;
type UserRoleFilter = (typeof userFilterOptions)[number]["value"];

type UserFilters = { q: string; role: UserRoleFilter };

type Params = Record<string, string | string[] | undefined>;

export function parseUserFilters(params: Params): UserFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim() : "");
  const role = get("role");
  return {
    q: get("q").slice(0, 80),
    role: userFilterOptions.some((o) => o.value === role) ? (role as UserRoleFilter) : "",
  };
}

export function filterUsers<
  T extends {
    name: string;
    email: string;
    role: AppRole | null;
    banned: boolean;
    applicationStatus?: ApplicationStatus;
  },
>(rows: T[], f: UserFilters): T[] {
  const needle = f.q.toLocaleLowerCase("mn");
  return rows.filter((r) => {
    if (f.role === "admin" && r.role !== "admin") return false;
    if (f.role === "member" && r.role !== "member") return false;
    if (f.role === "applicant" && r.role !== null) return false;
    if (f.role === "banned" && !r.banned) return false;
    if (!needle) return true;
    return (
      r.name.toLocaleLowerCase("mn").includes(needle) || r.email.toLowerCase().includes(needle)
    );
  });
}
