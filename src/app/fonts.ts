import { Montserrat, Nunito_Sans } from "next/font/google";

// Both fonts support Cyrillic (Mongolian).
export const fontDisplay = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
  // Headings only: not preloaded, so the body text (usually the LCP element) isn't delayed by
  // competing font downloads on slow mobile connections.
  preload: false,
  // No `weight` → one variable font file per subset (static weights would download a file each).
});

export const fontBody = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});
