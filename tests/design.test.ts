/**
 * Design-system guards: components use the semantic colour tokens from globals.css, never raw
 * Tailwind palette shades or hex values, so light and dark themes stay consistent.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mdx?)$/.test(f) ? [p] : [];
  });

const FILES = [...walk("src/components"), ...walk("src/app")].filter(
  // The printable certificate is a fixed light document (paper), by design.
  (f) => !f.includes("me/certificate"),
);

const PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|decoration|divide|placeholder)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const WHITE_BLACK = /\b(?:bg|text|border|ring|from|to|via)-(?:white|black)\b/;

/** Places where literal white/black is the point, with the reason. */
const WHITE_BLACK_ALLOWED: Record<string, string> = {
  "src/components/brand/brand-lockup.tsx": "logo tile: the logo files have white backgrounds",
  "src/components/common/partner-chip.tsx": "partner logo tile",
  "src/components/common/cover-image.tsx": "text on official SDG colours",
  "src/components/impact/sdg-badges.tsx": "text on official SDG colours",
  "src/components/impact/sdg-explorer.tsx": "text on official SDG colours",
  "src/components/impact/impact-timeline.tsx": "text on official SDG colours",
  "src/components/events/month-calendar.tsx": "text on a saturated event dot",
  "src/components/gallery/gallery-grid.tsx": "photo lightbox scrim and controls over photos",
  "src/components/ui/dialog.tsx": "modal scrim",
  "src/components/ui/sheet.tsx": "drawer scrim",
};

describe("colour tokens only", () => {
  test("no raw Tailwind palette shades in components and pages", () => {
    const bad = FILES.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => [line, i] as const)
        .filter(([line]) => PALETTE.test(line))
        .map(([line, i]) => `${f}:${i + 1}: ${line.trim().slice(0, 100)}`),
    );
    expect(bad).toEqual([]);
  });

  test("literal white/black only where documented", () => {
    const bad = FILES.filter(
      (f) => !(f in WHITE_BLACK_ALLOWED) && WHITE_BLACK.test(readFileSync(f, "utf8")),
    );
    expect(bad).toEqual([]);
  });

  test("no hex colours in class names (tokens live in globals.css)", () => {
    const bad = FILES.filter((f) =>
      /className=[^>]*#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, "utf8")),
    );
    expect(bad).toEqual([]);
  });

  test("both themes define every semantic token", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const block = (sel: string) =>
      css.slice(css.indexOf(`${sel} {`), css.indexOf("}", css.indexOf(`${sel} {`)));
    const names = (b: string) => new Set([...b.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
    const light = names(block(":root"));
    const dark = names(block(".dark"));
    for (const token of [
      "background",
      "foreground",
      "card",
      "muted",
      "muted-foreground",
      "border",
      "input",
      "ring",
      "primary",
      "primary-foreground",
      "surface-2",
      "on-primary",
      "success",
      "warning",
      "info",
      "destructive",
      "shadow-soft",
    ]) {
      expect(light.has(token), `light --${token}`).toBe(true);
      expect(dark.has(token), `dark --${token}`).toBe(true);
    }
  });
});
