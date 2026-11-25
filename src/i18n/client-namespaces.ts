/**
 * Message namespaces sent to the browser: every namespace a client component ("use client" +
 * useTranslations) reads must be listed here (tests/messages.test.ts checks this).
 */
/** Sent with every public page (part of the cached HTML, so keep it small). */
export const baseClientNamespaces = [
  "Common",
  "Nav",
  "Theme",
  "Locale",
  "Share",
  "Gallery",
  "Errors",
] as const;
/** Added only where these client components render (forms: contact + join; Me: /me). */
export const formNamespaces = ["Forms"] as const;
export const memberNamespaces = ["Forms", "Me"] as const;

export const clientNamespaces = [
  ...baseClientNamespaces,
  ...formNamespaces,
  ...memberNamespaces,
] as const;
