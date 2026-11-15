// Optional environment variables / secrets (not always present in .dev.vars, so `wrangler types`
// may not emit them). Merged into the generated CloudflareEnv interface.
interface CloudflareEnv {
  /** Public site origin, e.g. https://unicef130.mn (no trailing slash). Used for SEO URLs. */
  SITE_URL?: string;
  /** Clerk publishable key (public; wrangler var in production, .dev.vars locally). */
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  /** Clerk Backend API secret (wrangler secret). */
  CLERK_SECRET_KEY?: string;
  /** Svix signing secret of the Clerk webhook endpoint (wrangler secret). */
  CLERK_WEBHOOK_SIGNING_SECRET?: string;
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
