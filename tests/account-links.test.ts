/**
 * Sign-in outage (2026-11-28): «Нэвтрэх» was a client-side navigation, so /sign-in kept the
 * public page's CSP and clerk-js was blocked — the card never appeared. Every link into an
 * account area must be a full page load (src/lib/auth/account-paths.ts).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { NextIntlClientProvider } from "next-intl";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Link } from "@/i18n/navigation";
import { isAccountPath } from "@/lib/auth/account-paths";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

function render(locale: "mn" | "en", href: Parameters<typeof Link>[0]["href"]) {
  const link = createElement(Link, { href }, "x");
  return renderToStaticMarkup(
    createElement(NextIntlClientProvider, { locale, messages: {} } as never, link),
  );
}

describe("links into account areas", () => {
  test("account paths", () => {
    for (const p of [
      "/sign-in",
      "/en/sign-in",
      "/sign-in/factor-one",
      "/join",
      "/en/join",
      "/join?x=1",
      "/me",
      "/me/profile",
      "/en/me/certificate",
      "/admin",
      "/admin/news",
      "/sign-out",
      "/sign-out?next=sign-in",
      "/auth/continue",
    ])
      expect({ p, account: isAccountPath(p) }).toEqual({ p, account: true });
    for (const p of [
      "/",
      "/en",
      "/news",
      "/members",
      "/joint",
      "/media/x.webp",
      "/search",
      "/about",
      "/en/events/x",
      "/administration",
    ])
      expect({ p, account: isAccountPath(p) }).toEqual({ p, account: false });
  });

  test("Link renders a plain <a> with the locale prefix for account paths", () => {
    expect(render("mn", "/sign-in")).toBe('<a href="/sign-in">x</a>');
    expect(render("en", "/sign-in")).toBe('<a href="/en/sign-in">x</a>');
    expect(render("en", "/join")).toBe('<a href="/en/join">x</a>');
    expect(render("en", { pathname: "/me/certificate", query: { year: "2025-2026" } })).toBe(
      '<a href="/en/me/certificate?year=2025-2026">x</a>',
    );
  });

  test("no next/link into an account area outside the admin panel", () => {
    const files = walk("src").filter(
      (f) =>
        /\.tsx$/.test(f) &&
        !f.startsWith(join("src", "app", "admin")) &&
        !f.startsWith(join("src", "components", "admin")),
    );
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const m = /import (\w+) from "next\/link"/.exec(src);
      if (!m) continue;
      const tag = new RegExp(`<${m[1]}\\b[^>]*href=\\{?["'\`]([^"'\`]+)`, "g");
      for (const [, href] of src.matchAll(tag)) if (isAccountPath(href!)) bad.push(`${f}: ${href}`);
      if (new RegExp(`<${m[1]}\\b[^>]*href=\\{(?!["'\`])`).test(src))
        bad.push(`${f}: dynamic href`);
    }
    expect(bad).toEqual([]);
  });
});
