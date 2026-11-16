import localFont from "next/font/local";

/*
 * Self-hosted, pre-subset variable fonts (weights 400–800): one small file per family with Latin
 * and Mongolian Cyrillic (incl. Ө/Ү). Google's own split would load up to 7 files (Mongolian
 * letters sit in its "cyrillic-ext" subset). Regenerate with `bun run fonts` (scripts/fonts.ts).
 * Both are SIL OFL 1.1 — licences in src/assets/fonts/.
 */
export const fontDisplay = localFont({
  src: "../assets/fonts/montserrat.woff2",
  weight: "400 800",
  variable: "--font-display",
  display: "swap",
});

export const fontBody = localFont({
  src: "../assets/fonts/nunito-sans.woff2",
  weight: "400 800",
  variable: "--font-body",
  display: "swap",
});
