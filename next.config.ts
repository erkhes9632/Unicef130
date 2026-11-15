import { existsSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Logo files the developer adds to public/logos/ are detected at build time, so pages never
// request a missing file (no 404s). Uploads in admin → Site settings take precedence at runtime.
const logoFile = (name: string) => (existsSync(`public/logos/${name}`) ? `/logos/${name}` : "");

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

const nextConfig: NextConfig = {
  env: {
    BRAND_SCHOOL_LOGO_FILE: logoFile("school-130.png"),
    BRAND_UNICEF_LOGO_FILE: logoFile("unicef.png"),
    // Clerk: no usage telemetry (users are mostly minors) and no "keyless" demo app.
    NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED: "1",
    CLERK_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_CLERK_KEYLESS_DISABLED: "1",
  },
  // NOTE: `cacheComponents` / `partialPrefetching` (create-next-app defaults) are disabled on purpose:
  // with them enabled the Worker hangs on workerd ("Cache Components ... setTimeout()" warning).
  // Re-test before enabling again.
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
