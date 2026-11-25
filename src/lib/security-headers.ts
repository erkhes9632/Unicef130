/**
 * Security response headers. Public pages are cached HTML (the same bytes for every visitor), so
 * the Content-Security-Policy cannot carry a per-request nonce: inline scripts are allowed
 * ('unsafe-inline'), but only Next.js / theme bootstrapping writes them — user content is never
 * rendered as HTML (rich text is JSON, rendered by React). Scripts load from our own origin and
 * the listed hosts only.
 *
 * Allowed third parties: Clerk (account areas only: its Frontend API serves the scripts and the
 * session requests; bot protection runs Cloudflare Turnstile), Cloudflare Turnstile (contact
 * form), Google Maps (contact page iframe) and Cloudflare Web Analytics (cookie-free beacon). Images may come from the site itself (R2 via /media),
 * data/blob previews and https (rich text images, Clerk avatars from img.clerk.com).
 */
export function buildCsp({
  dev,
  https,
  clerkFrontendApi,
}: {
  dev: boolean;
  https: boolean;
  /** e.g. https://clerk.example.mn (from the publishable key); omitted when Clerk is not set up. */
  clerkFrontendApi?: string | null;
}) {
  const clerk = clerkFrontendApi ? [clerkFrontendApi] : [];
  // Clerk's bot / fraud protection probes run on these hosts (any port).
  const clerkProtect = clerkFrontendApi
    ? ["https://*.protect.clerk.com", "https://*.protect.clerk.com:*"]
    : [];
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        "'unsafe-inline'",
        "https://challenges.cloudflare.com",
        "https://static.cloudflareinsights.com",
        ...clerk,
        // React Fast Refresh needs eval in development only.
        ...(dev ? ["'unsafe-eval'"] : []),
      ],
    ],
    // Inline style attributes are used for data-driven colors and widths (SDG badges, bars).
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    [
      "connect-src",
      [
        "'self'",
        "https://challenges.cloudflare.com",
        "https://cloudflareinsights.com",
        ...clerk,
        ...clerkProtect,
        ...(dev ? ["ws:"] : []),
      ],
    ],
    [
      "frame-src",
      ["https://challenges.cloudflare.com", "https://www.google.com", ...clerkProtect.slice(0, 1)],
    ],
    // Clerk keeps its session timers in a blob worker.
    ["worker-src", ["'self'", "blob:"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["manifest-src", ["'self'"]],
  ];
  const parts = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (https) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Headers that do not depend on the request (also mirrored in public/_headers for assets). */
export function staticSecurityHeaders({ https }: { https: boolean }): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    // Browsers ignore HSTS over http, but it is only meaningful (and only sent) on https.
    ...(https ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
}
