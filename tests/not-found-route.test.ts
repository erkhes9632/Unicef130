import { readdirSync, statSync } from "node:fs";
import { readFileSync as read } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { checkRoute, notFoundPath, PAGE_SEGMENTS } from "@/lib/not-found-route";

describe("cheap 404s (worker.ts)", () => {
  test("every public page section is known (a new page must be added to PAGE_SEGMENTS)", () => {
    const dir = "src/app/[locale]";
    const sections = readdirSync(dir).filter(
      (f) => statSync(join(dir, f)).isDirectory() && !f.startsWith("[") && !f.startsWith("("),
    );
    for (const s of sections) expect([s, PAGE_SEGMENTS.includes(s as never)]).toEqual([s, true]);
  });

  test("real routes and non-pages go to the app", () => {
    for (const p of [
      "/",
      "/en",
      "/about",
      "/en/news",
      "/impact/2025-2026",
      "/en/members/2024-2025",
      "/me/certificate",
      "/sign-in/factor-one",
      "/contact",
      "/admin/news",
      "/media/content/a.webp",
      "/sitemap.xml",
      "/mn/about",
    ])
      expect([p, checkRoute(p).kind]).toEqual([p, "app"]);
  });

  test("unknown paths are answered by the shared 404 page", () => {
    expect(checkRoute("/en/this-does-not-exist")).toEqual({ kind: "missing", locale: "en" });
    expect(checkRoute("/wp-login")).toEqual({ kind: "missing", locale: "mn" });
    expect(checkRoute("/impact/latest")).toEqual({ kind: "missing", locale: "mn" });
    expect(checkRoute("/news/a/b")).toEqual({ kind: "missing", locale: "mn" });
    expect(checkRoute("/about/x").kind).toBe("missing");
  });

  test("detail pages are checked against D1 by slug", () => {
    expect(checkRoute("/news/nope")).toEqual({
      kind: "slug",
      locale: "mn",
      table: "news",
      slug: "nope",
    });
    expect(checkRoute("/en/gallery/mod-tarikh")).toMatchObject({ table: "albums", locale: "en" });
    expect(checkRoute("/events/%D0%B0")).toMatchObject({ slug: "а" });
    expect(checkRoute("/events/%E0%A4%A").kind).toBe("missing");
  });
});

describe("static 404 pages", () => {
  test("public/errors files exist and match the messages (run `bun run brand:404`)", async () => {
    const { notFoundHtml } = await import("../scripts/build-404");
    for (const locale of ["mn", "en"] as const) {
      const file = `public${notFoundPath(locale)}`;
      expect([file, read(file, "utf8") === notFoundHtml(locale)]).toEqual([file, true]);
    }
  });
  test("no scripts, no data: a plain HTML file with the home link", () => {
    const html = read("public/errors/404-en.html", "utf8");
    expect(html).not.toContain("<script");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="/en"');
  });
});
