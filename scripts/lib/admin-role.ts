/** Pure parts of scripts/admin-role.ts (unit-tested in tests/admin-role.test.ts). */

export type RoleCommand = "grant" | "revoke";

export type ClerkUserLite = {
  id: string;
  banned: boolean;
  publicMetadata: Record<string, unknown>;
  emailAddresses: { emailAddress: string }[];
};

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

/** "pk/sk" prefix tells the instance: sk_test_ = Development, sk_live_ = Production. */
export function instanceOf(secretKey: string): "development" | "production" | null {
  if (/^sk_test_[A-Za-z0-9]+$/.test(secretKey)) return "development";
  if (/^sk_live_[A-Za-z0-9]+$/.test(secretKey)) return "production";
  return null;
}

export const isAdmin = (u: ClerkUserLite) => u.publicMetadata.role === "admin";

/**
 * What the command should do for this user. Revoking refuses to remove the last admin who can
 * still sign in (break-glass: grant someone else first).
 */
export function planRoleChange(
  command: RoleCommand,
  target: ClerkUserLite,
  allUsers: readonly ClerkUserLite[],
): { action: "set-admin" | "remove-admin" | "unban-and-set-admin" } | { refuse: string } {
  if (command === "grant") {
    if (isAdmin(target) && !target.banned) return { refuse: "already an admin" };
    return { action: target.banned ? "unban-and-set-admin" : "set-admin" };
  }
  if (!isAdmin(target)) return { refuse: "not an admin" };
  const activeAdmins = allUsers.filter((u) => isAdmin(u) && !u.banned);
  if (activeAdmins.length <= 1 && activeAdmins.some((u) => u.id === target.id))
    return { refuse: "this is the last admin — grant another admin first" };
  return { action: "remove-admin" };
}
