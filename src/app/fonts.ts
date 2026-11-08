import { Montserrat, Nunito_Sans } from "next/font/google";

// Both fonts support Cyrillic (Mongolian).
export const fontDisplay = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

export const fontBody = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});
