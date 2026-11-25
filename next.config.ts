import { existsSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildCsp, staticSecurityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// `next dev` does not read .dev.vars (only wrangler does). Copy it into process.env in development
// so server code and the Clerk SDK see the same keys as the Workers preview. Never at build time:
// production values come from wrangler vars / secrets at runtime.
if (process.env.NODE_ENV === "development" && existsSync(".dev.vars")) {
  for (const line of readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]!] === undefined)
      process.env[m[1]!] = m[2]!.replace(/^(["'])(.*)\1$/, "$2");
  }
}

/**
 * Paths handled by the proxy (Clerk, sign-in gate, CSP with Clerk's origin). Everything else is a
 * public page served from the cache, with the headers below.
 */
const ACCOUNT_AREAS = "(?:en/)?(?:me|join|sign-in|sign-out)(?:/|$)|admin(?:/|$)|auth/|api/admin/";
/** Not a page: framework files, API, uploads, the logo kit, files with an extension. */
const NOT_A_PAGE = "en(?:/|$)|mn(?:/|$)|admin(?:/|$)|api/|auth/|media/|brand/|_next/|.*\\.";

const publicHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildCsp({ dev: process.env.NODE_ENV === "development", https: true }),
  },
  ...Object.entries(staticSecurityHeaders({ https: true })).map(([key, value]) => ({ key, value })),
];

const nextConfig: NextConfig = {
  // Mongolian pages have no prefix (/about); they live in app/[locale] as /mn/about. A rewrite
  // (cheap, no proxy run) maps them; /mn/... addresses redirect to the unprefixed form.
  async redirects() {
    return [
      { source: "/mn", destination: "/", permanent: true },
      { source: "/mn/:path*", destination: "/:path*", permanent: true },
      // "Системийн төлөв" and "Статистик" are part of the dashboard now.
      { source: "/admin/system", destination: "/admin", permanent: true },
      { source: "/admin/stats", destination: "/admin", permanent: true },
      // Messages from the old contact form are no longer shown (the table is kept for now).
      { source: "/admin/messages", destination: "/admin", permanent: true },
      // No contact page any more: e-mail and Instagram are in the footer (id="contact").
      { source: "/contact", destination: "/#contact", permanent: true },
      { source: "/en/contact", destination: "/en#contact", permanent: true },
      // Year pages used to be ?year= (the pages are cached now, so it is a path segment).
      ...["", "/en"].flatMap((prefix) =>
        ["impact", "members"].map((page) => ({
          source: `${prefix}/${page}`,
          has: [{ type: "query" as const, key: "year", value: "(?<year>\\d{4}-\\d{4})" }],
          destination: `${prefix}/${page}/:year`,
          permanent: true,
        })),
      ),
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/mn" },
        { source: `/:path((?!${NOT_A_PAGE}).+)`, destination: "/mn/:path" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: `/((?!${ACCOUNT_AREAS}).*)`, headers: publicHeaders }];
  },
  env: {
    // Clerk: no usage telemetry (users are mostly minors) and no "keyless" demo app.
    NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED: "1",
    CLERK_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_CLERK_KEYLESS_DISABLED: "1",
  },
  // NOTE: `cacheComponents` / `partialPrefetching` (create-next-app defaults) are disabled on purpose:
  // with them enabled the Worker hangs on workerd ("Cache Components ... setTimeout()" warning).
  // Re-test before enabling again.
  // 404 for URLs outside the two root layouts (app/[locale], app/admin).
  experimental: { globalNotFound: true },
  images: {
    // Images are served straight from R2 / public (resized in the browser before upload),
    // so the Next.js optimizer (unsupported on Workers without extra bindings) is off.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

// Gives `next dev` access to Cloudflare bindings (D1, R2, ...) via getCloudflareContext().
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
