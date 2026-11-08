import type { Locale } from "@/i18n/routing";

/** Picks the English variant when requested and available; Mongolian is the fallback. */
export function pick<T>(locale: Locale, mn: T, en: T | null | undefined): T {
  if (locale === "en" && en !== null && en !== undefined && en !== "") return en;
  return mn;
}
