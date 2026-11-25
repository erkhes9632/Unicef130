/**
 * Free plan guard: public pages must stay cacheable (ISR). A request-time API in app/[locale]
 * would make every visit a full render (far over 10 ms CPU) — see README → Performance & caching.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Per-visitor pages (session or query string): rendered per request on purpose. */
const DYNAMIC = [
  "src/app/[locale]/join/page.tsx",
  "src/app/[locale]/me/page.tsx",
  "src/app/[locale]/me/certificate/page.tsx",
  "src/app/[locale]/search/page.tsx",
  "src/app/[locale]/sign-out/page.tsx",
];
/** Reads the session only when `signedIn` (the dynamic /join); /join/guest passes false. */
const GUARDED = ["src/app/[locale]/join/join-view.tsx"];

describe("cacheable public pages", () => {
  const files = walk("src/app/[locale]").filter((f) => /\.tsx?$/.test(f));

  test("no request-time APIs outside the per-visitor pages", () => {
    const bad = files
      .filter(
        (f) =>
          !DYNAMIC.includes(f) &&
          !GUARDED.includes(f) &&
          !f.includes("/me/") &&
          !f.endsWith("actions.ts"),
      )
      .filter((f) =>
        /\b(headers|cookies|connection)\(\)|searchParams|getCurrentUser\(|auth\(\)/.test(
          readFileSync(f, "utf8"),
        ),
      );
    expect(bad).toEqual([]);
  });

  test("per-visitor pages and the admin opt out of caching explicitly", () => {
    for (const f of [...DYNAMIC, "src/app/admin/layout.tsx"])
      expect(readFileSync(f, "utf8")).toContain('export const dynamic = "force-dynamic"');
  });

  test("the public root renders nothing per request", () => {
    const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
    expect(layout).toContain("generateStaticParams");
    expect(layout).toMatch(/export const revalidate = \d+/);
    expect(readFileSync("src/components/layout/root-document.tsx", "utf8")).not.toMatch(
      /headers\(\)|cookies\(\)/,
    );
  });
});
