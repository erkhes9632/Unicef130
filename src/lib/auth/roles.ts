/**
 * Roles — pure rules shared by the middleware, server guards, admin screens and tests.
 *
 * - admin:  club leaders and the advisor teacher (everything under /admin)
 * - member: approved club members (the member area /me)
 * - none:   a signed-in applicant (may apply for the open recruitment period and see the status)
 *
 * The role lives in Clerk `publicMetadata.role`, is copied into the session token as the `role`
 * claim (read by the middleware) and mirrored in D1 `users.role` (read by pages and actions).
 */
export const appRoles = ["admin", "member"] as const;
export type AppRole = (typeof appRoles)[number];

export function toRole(value: unknown): AppRole | null {
  return (appRoles as readonly unknown[]).includes(value) ? (value as AppRole) : null;
}

export const roleLabels: Record<AppRole | "none", string> = {
  admin: "Админ",
  member: "Гишүүн",
  none: "Өргөдөл гаргагч",
};

export const roleLabel = (role: AppRole | null) => roleLabels[role ?? "none"];

export const SIGN_IN_PATH = "/sign-in";
/** Where Clerk sends people after signing in when no return address was given. */
export const AFTER_SIGN_IN_PATH = "/auth/continue";

/** Landing page after sign-in: admin → /admin, member → /me, applicant → /join. */
export function homePathFor(role: AppRole | null, locale: "mn" | "en" = "mn") {
  if (role === "admin") return "/admin";
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}${role === "member" ? "/me" : "/join"}`;
}

export type RouteArea = "admin" | "member" | "public";

/** /admin/* is admin-only, /me/* (and /en/me/*) is for members and admins, the rest is public. */
export function routeArea(pathname: string): RouteArea {
  if (/^\/admin(\/|$)/.test(pathname)) return "admin";
  if (/^(\/en)?\/me(\/|$)/.test(pathname)) return "member";
  return "public";
}

export type AccessDecision = { allow: true } | { allow: false; redirect: "sign-in" | string };

/**
 * Who may open an area. Not signed in → sign-in; an applicant on /me → /join; anyone but an
 * admin on /admin → home. Checked in the middleware and again in every page and Server Action.
 */
export function decideAccess(
  area: RouteArea,
  who: { signedIn: boolean; role: AppRole | null },
): AccessDecision {
  if (area === "public") return { allow: true };
  if (!who.signedIn) return { allow: false, redirect: "sign-in" };
  if (area === "admin")
    return who.role === "admin" ? { allow: true } : { allow: false, redirect: "/" };
  return who.role ? { allow: true } : { allow: false, redirect: "/join" };
}
