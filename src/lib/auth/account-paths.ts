/**
 * Account areas: the proxy serves them with the Content-Security-Policy that allows Clerk
 * (src/proxy.ts). A client-side navigation keeps the CSP of the page it started from, and a
 * public page's CSP blocks clerk-js — the sign-in card never appeared after clicking «Нэвтрэх»
 * (2026-11-28). Links into these areas are therefore full page loads (`Link` in
 * src/i18n/navigation.ts does that automatically; tests/account-links.test.ts guards it).
 */
const ACCOUNT_PATH = /^\/(?:(?:en|mn)\/)?(?:sign-in|sign-out|join|me|admin|auth)(?:[/?#]|$)/;

export function isAccountPath(href: string): boolean {
  return ACCOUNT_PATH.test(href);
}
