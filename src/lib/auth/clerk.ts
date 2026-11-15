/**
 * Clerk settings shared by the middleware, the root layout and server code (no secrets here).
 * Keys are read at runtime: on Workers from wrangler vars / secrets, in `next dev` from .dev.vars
 * (copied into process.env by next.config.ts).
 */
import { SIGN_IN_PATH } from "./roles";

export function clerkPublishableKey() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
}

/** "pk_test_Zm9vLmNsZXJrLmFjY291bnRzLmRldiQ" → "https://foo.clerk.accounts.dev" (null if invalid). */
export function frontendApiFromPublishableKey(key: string): string | null {
  const match = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(key);
  if (!match) return null;
  try {
    const host = atob(match[2]!.replace(/-/g, "+").replace(/_/g, "/")).replace(/\$$/, "");
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}

/** /sign-in for Mongolian pages and /admin, /en/sign-in for English pages. */
export function signInPathFor(pathname: string) {
  return /^\/en(\/|$)/.test(pathname) ? `/en${SIGN_IN_PATH}` : SIGN_IN_PATH;
}
