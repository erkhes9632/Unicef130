/**
 * Downloads the two site fonts as small self-hosted files (one per family), subset by Google
 * Fonts to the characters the site needs: Latin + Latin-1, Russian Cyrillic plus the Mongolian
 * letters Ө ө Ү ү (they live in Google's "cyrillic-ext" subset, which otherwise adds a whole
 * extra file), common punctuation, ₮ and arrows. Weight axis 400–800 (all weights the UI uses).
 *
 *   bun run fonts
 *
 * Outputs: src/assets/fonts/montserrat.woff2, src/assets/fonts/nunito-sans.woff2
 * Both fonts are SIL Open Font License 1.1 (see src/assets/fonts/OFL-*.txt). Other characters
 * (e.g. emoji or other scripts typed in admin content) fall back to the system font.
 */
import { writeFile } from "node:fs/promises";

const ranges: [number, number][] = [
  [0x20, 0x7e], // Basic Latin
  [0xa0, 0xff], // Latin-1 (©, «», ×, é …)
  [0x400, 0x45f], // Cyrillic
  [0x490, 0x491], // Ґ ґ
  [0x4ae, 0x4af], // Ү ү (Mongolian)
  [0x4e8, 0x4e9], // Ө ө (Mongolian)
  [0x2009, 0x2009], // thin space
  [0x2013, 0x2014], // – —
  [0x2018, 0x201e], // quotes
  [0x2022, 0x2022], // •
  [0x2026, 0x2026], // …
  [0x2039, 0x203a], // ‹ ›
  [0x20ac, 0x20ac], // €
  [0x20ae, 0x20ae], // ₮ (tögrög)
  [0x2116, 0x2116], // №
  [0x2122, 0x2122], // ™
  [0x2190, 0x2193], // ← ↑ → ↓
  [0x2212, 0x2212], // −
];
const text = ranges
  .flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)))
  .join("");

// A current browser user agent makes Google serve woff2.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const families = [
  { css: "Montserrat:wght@400..800", out: "src/assets/fonts/montserrat.woff2" },
  { css: "Nunito+Sans:wght@400..800", out: "src/assets/fonts/nunito-sans.woff2" },
];

for (const f of families) {
  const url = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const src = /url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/.exec(css)?.[1];
  if (!src) throw new Error(`No woff2 in the Google Fonts response for ${f.css}`);
  const file = new Uint8Array(
    await (await fetch(src, { headers: { "User-Agent": UA } })).arrayBuffer(),
  );
  await writeFile(f.out, file);
  console.log(`${f.out}  ${Math.round(file.byteLength / 1024)} KB`);
}
