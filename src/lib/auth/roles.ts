import type { UserRole } from "@/db/schema";

const rank: Record<UserRole, number> = { editor: 1, admin: 2 };

export function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "editor";
}

/** Admins can do everything editors can. */
export function hasRole(userRole: unknown, required: UserRole) {
  return isRole(userRole) && rank[userRole] >= rank[required];
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Админ",
  editor: "Редактор",
};
