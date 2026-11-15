import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@/db/schema";
import { getSiteSettings } from "@/lib/data/settings";
import { getAuth } from "./index";
import { can, isRole, needsTwoFactorSetup, type Permission } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  /** Id of the session used for this request (to mark "this device" in the session list). */
  sessionId: string;
};

export const TWO_FACTOR_SETUP_PATH = "/admin/profile/two-factor";

/** Session user for this request (deduplicated per render), or null. Disabled users → null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  // Always validate against D1 (no cookie cache) so disabled users / revoked sessions are
  // rejected immediately. Admin traffic is low, so the extra query is fine.
  const result = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!result) return null;
  const u = result.user as typeof result.user & {
    role?: unknown;
    banned?: unknown;
    twoFactorEnabled?: unknown;
  };
  if (u.banned) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    // An unknown role gets no permissions at all.
    role: isRole(u.role) ? u.role : "reviewer",
    twoFactorEnabled: u.twoFactorEnabled === true,
    sessionId: result.session.id,
  };
});

async function twoFactorPending(user: CurrentUser) {
  const { security } = await getSiteSettings();
  return needsTwoFactorSetup(user, security.requireAdminTwoFactor);
}

/**
 * For admin pages/layouts: redirects to the login page when not signed in, to the two-factor
 * setup when an admin has not enrolled yet, and to the dashboard when the role lacks `permission`.
 * `allowWithoutTwoFactor` is only for the layout and the profile / two-factor pages themselves.
 */
export async function requireUser(
  permission?: Permission,
  { allowWithoutTwoFactor = false }: { allowWithoutTwoFactor?: boolean } = {},
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!allowWithoutTwoFactor && (await twoFactorPending(user)))
    redirect(`${TWO_FACTOR_SETUP_PATH}?required=1`);
  if (permission && !can(user.role, permission)) redirect("/admin?forbidden=1");
  return user;
}

export class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden" | "two_factor_required") {
    super(code);
    this.name = "AuthError";
  }
}

/**
 * For Server Actions and route handlers: every admin write must call this first.
 * Throws AuthError (never trust the UI to hide buttons).
 */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (await twoFactorPending(user)) throw new AuthError("two_factor_required");
  if (!can(user.role, permission)) throw new AuthError("forbidden");
  return user;
}

/** For "my profile" actions (password, sessions, two-factor setup): any signed-in user. */
export async function requireSession(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  return user;
}
