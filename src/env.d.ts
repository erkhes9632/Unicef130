// Optional environment variables / secrets (not always present in .dev.vars, so `wrangler types`
// may not emit them). Merged into the generated CloudflareEnv interface.
interface CloudflareEnv {
  /** Public site origin, e.g. https://unicef130.mn (no trailing slash). Used for SEO URLs. */
  SITE_URL?: string;
  /** Public base URL used by Better Auth; inferred from the request when unset. */
  BETTER_AUTH_URL?: string;
  /** Cloudflare Turnstile site key (public). Missing → official test site key. */
  TURNSTILE_SITE_KEY?: string;
  /** Cloudflare Turnstile secret. Missing → test secret in development only; production rejects forms. */
  TURNSTILE_SECRET_KEY?: string;
  /** Google service account used to append join applications to a Sheet (optional). */
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  /** Sheet tab name, default "Applications". */
  GOOGLE_SHEET_TAB?: string;
}
