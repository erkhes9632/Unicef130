import { userRoles, type UserRole } from "@/db/schema";

/**
 * What a signed-in user may do in the admin panel. Checked on the server in every page and
 * Server Action — the menu only hides links.
 *
 * - content:      news, events, gallery
 * - members:      member list, teams, volunteer hours
 * - applications: join applications (personal data of minors)
 * - messages:     contact-form messages
 * - admin:        settings, pages, impact numbers, users, audit log, deleting personal data
 */
export const permissions = ["content", "members", "applications", "messages", "admin"] as const;
export type Permission = (typeof permissions)[number];

const grants: Record<UserRole, readonly Permission[]> = {
  admin: permissions,
  editor: ["content", "members"],
  reviewer: ["applications"],
};

export function isRole(value: unknown): value is UserRole {
  return (userRoles as readonly unknown[]).includes(value);
}

export function can(role: unknown, permission: Permission): boolean {
  return isRole(role) && grants[role].includes(permission);
}

export function permissionsOf(role: unknown): readonly Permission[] {
  return isRole(role) ? grants[role] : [];
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Админ",
  editor: "Редактор",
  reviewer: "Өргөдөл хянагч",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "Бүх эрх: тохиргоо, хэрэглэгчид, өргөдөл, контент",
  editor: "Мэдээ, арга хэмжээ, зургийн цомог, гишүүд",
  reviewer: "Зөвхөн элсэлтийн өргөдлүүд",
};

/** Admins must finish two-factor setup before using the panel (when the setting is on). */
export function needsTwoFactorSetup(
  user: { role: UserRole; twoFactorEnabled: boolean },
  requireAdminTwoFactor: boolean,
) {
  return requireAdminTwoFactor && user.role === "admin" && !user.twoFactorEnabled;
}
