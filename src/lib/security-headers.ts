/**
 * Security response headers. The Content-Security-Policy uses a per-request nonce (set by the
 * middleware; Next.js adds it to its own scripts), so no inline script runs without it.
 *
 * Allowed third parties: Clerk (sign-in: its Frontend API serves the scripts and the session
 * requests; bot protection runs Cloudflare Turnstile), Cloudflare Turnstile (contact form) and
 * Google Maps (contact page iframe). Images may come from the site itself (R2 via /media),
 * data/blob previews and https (rich text images, Clerk avatars from img.clerk.com).
 */
export function buildCsp({
  nonce,
  dev,
  https,
  clerkFrontendApi,
}: {
  nonce: string;
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
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "https://challenges.cloudflare.com",
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

export function generateNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
