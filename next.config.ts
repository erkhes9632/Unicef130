import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // NOTE: `cacheComponents` / `partialPrefetching` (create-next-app defaults) are disabled on purpose:
  // with them enabled the Worker hangs on workerd ("Cache Components ... setTimeout()" warning).
  // Re-test before enabling again. See PROGRESS.md → Decisions.
  images: {
    // Images are served straight from R2 / public (pre-sized on upload, see PROGRESS.md),
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
