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

const roleLabels: Record<AppRole | "none", string> = {
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

type RouteArea = "admin" | "member" | "public";

/** /admin/* is admin-only, /me/* (and /en/me/*) is for members and admins, the rest is public. */
export function routeArea(pathname: string): RouteArea {
  if (/^\/admin(\/|$)/.test(pathname)) return "admin";
  // "/mn/me": OpenNext rewrites the unprefixed Mongolian URL before the proxy runs.
  if (/^(\/(en|mn))?\/me(\/|$)/.test(pathname)) return "member";
  return "public";
}

type AccessDecision = { allow: true } | { allow: false; redirect: "sign-in" };

/**
 * The middleware's early gate: /admin and /me need a signed-in session, nothing more. Roles are
 * decided on the server from D1 (repaired from Clerk), never from the session token's `role`
 * claim alone — the claim can lag after a role change, or be missing if the token template is
 * misconfigured, and a silent redirect would then lock a real admin out. Every page, layout and
 * Server Action checks the role itself (`getAdminAccess`, `requireMember`, `assert*`).
 */
export function decideAccess(area: RouteArea, who: { signedIn: boolean }): AccessDecision {
  if (area === "public" || who.signedIn) return { allow: true };
  return { allow: false, redirect: "sign-in" };
}
