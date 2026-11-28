/**
 * Display-only role hint for the public header. Public pages are cached HTML (the same for every
 * visitor), so the header learns the sign-in state in the browser, from two cookies:
 * - Clerk's `__client_uat` (a timestamp > 0 while signed in; dev instances add a suffix);
 * - `club_role`, set by /auth/continue after sign-in (cleared on sign-out).
 * Never used for access decisions: every page, action and route checks the role on the server.
 */
export const ROLE_HINT_COOKIE = "club_role";
export const ROLE_HINTS = ["admin", "member", "applicant"] as const;
export type RoleHint = (typeof ROLE_HINTS)[number];

export function readHeaderSession(cookie: string): { signedIn: boolean; role: RoleHint | null } {
  const signedIn = /(?:^|;\s*)__client_uat(?:_[\w-]+)?=[1-9]\d*/.test(cookie);
  if (!signedIn) return { signedIn: false, role: null };
  const role = new RegExp(`(?:^|;\\s*)${ROLE_HINT_COOKIE}=(\\w+)`).exec(cookie)?.[1];
  return {
    signedIn,
    role: (ROLE_HINTS as readonly string[]).includes(role ?? "") ? (role as RoleHint) : null,
  };
}

/**
 * Runs in <head> before the first paint of every page: marks `<html data-member-hint>` for
 * signed-in members and admins (same rule as `readHeaderSession`), so «Гишүүн болох» buttons
 * marked `hide-for-members` are hidden by CSS before they are drawn — removing them after
 * hydration moved the page up by their height (layout shift, 2026-11-28).
 */
export const MEMBER_HINT_SCRIPT = `try{var c=document.cookie;if(/(?:^|;\\s*)__client_uat(?:_[\\w-]+)?=[1-9]\\d*/.test(c)&&/(?:^|;\\s*)${ROLE_HINT_COOKIE}=(member|admin)(?:;|$)/.test(c))document.documentElement.setAttribute("data-member-hint","")}catch(e){}`;

/** Keeps the pre-paint mark in step when the hint changes without a reload. */
export function syncMemberHint(role: RoleHint | null, signedIn: boolean) {
  const on = signedIn && (role === "member" || role === "admin");
  document.documentElement.toggleAttribute("data-member-hint", on);
}

/** Set-Cookie value for the hint (not HttpOnly: the header script reads it). */
export function roleHintCookie(role: RoleHint | null, secure: boolean) {
  const attrs = `Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  return role
    ? `${ROLE_HINT_COOKIE}=${role}; Max-Age=${60 * 60 * 24 * 30}; ${attrs}`
    : `${ROLE_HINT_COOKIE}=; Max-Age=0; ${attrs}`;
}
