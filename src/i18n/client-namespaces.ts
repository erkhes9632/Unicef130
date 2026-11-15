/**
 * Message namespaces sent to the browser: every namespace a client component ("use client" +
 * useTranslations) reads must be listed here (tests/messages.test.ts checks this).
 */
export const clientNamespaces = [
  "Common",
  "Nav",
  "Theme",
  "Locale",
  "Forms",
  "Share",
  "Gallery",
  "Errors",
  "Me",
] as const;
