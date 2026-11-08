import type { Locale } from "@/i18n/routing";

const CYR_TO_LAT: Record<string, string> = {
  А: "A",
  Б: "B",
  В: "V",
  Г: "G",
  Д: "D",
  Е: "E",
  Ж: "J",
  З: "Z",
  И: "I",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  Ө: "U",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ү: "U",
  Х: "Kh",
};

/** School class for display: "10А" stays as-is in Mongolian, becomes "10A" in English. */
export function displayClassName(locale: Locale, className: string) {
  if (locale !== "en") return className;
  if (/^багш$/i.test(className.trim())) return "Teacher";
  return className.replace(/\p{Script=Cyrillic}/gu, (ch) => CYR_TO_LAT[ch.toUpperCase()] ?? ch);
}

/** Picks the English variant when requested and available; Mongolian is the fallback. */
export function pick<T>(locale: Locale, mn: T, en: T | null | undefined): T {
  if (locale === "en" && en !== null && en !== undefined && en !== "") return en;
  return mn;
}
