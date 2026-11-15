/**
 * Security response headers. The Content-Security-Policy uses a per-request nonce (set by the
 * middleware; Next.js adds it to its own scripts), so no inline script runs without it.
 *
 * Allowed third parties: Cloudflare Turnstile (script + frame) and Google Maps (contact page
 * iframe). Images may come from the site itself (R2 via /media), data/blob previews and https
 * (images inside rich text).
 */
export function buildCsp({ nonce, dev, https }: { nonce: string; dev: boolean; https: boolean }) {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "https://challenges.cloudflare.com",
        // React Fast Refresh needs eval in development only.
        ...(dev ? ["'unsafe-eval'"] : []),
      ],
    ],
    // Inline style attributes are used for data-driven colors and widths (SDG badges, bars).
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", "https://challenges.cloudflare.com", ...(dev ? ["ws:"] : [])]],
    ["frame-src", ["https://challenges.cloudflare.com", "https://www.google.com"]],
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
