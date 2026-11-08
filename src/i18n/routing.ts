import { defineRouting } from "next-intl/routing";

export const locales = ["mn", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "mn",
  // Mongolian URLs have no prefix (/about); English lives under /en/about.
  localePrefix: "as-needed",
  // Audience is Mongolian: never auto-redirect based on the browser language.
  localeDetection: false,
});
