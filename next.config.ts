import { existsSync } from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Logo files the developer adds to public/logos/ are detected at build time, so pages never
// request a missing file (no 404s). Uploads in admin → Site settings take precedence at runtime.
const logoFile = (name: string) => (existsSync(`public/logos/${name}`) ? `/logos/${name}` : "");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    BRAND_SCHOOL_LOGO_FILE: logoFile("school-130.png"),
    BRAND_UNICEF_LOGO_FILE: logoFile("unicef.png"),
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
