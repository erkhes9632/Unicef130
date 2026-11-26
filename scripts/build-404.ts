/**
 * Writes the static 404 pages (public/errors/404.html, 404-en.html). worker.ts serves them for
 * unknown URLs with status 404: no database, no sign-in code, no rendering — they cannot fail
 * or use CPU (Free plan). Texts come from messages/*.json, colours from globals.css, so run
 * this after changing either (`bun run brand:404`; tests/not-found-route.test.ts checks it).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const token = (name: string) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (!m) throw new Error(`colour --${name} not found in globals.css`);
  return m[1];
};
const dark = css.slice(css.indexOf(".dark {"));
const darkToken = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(dark)![1];

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function notFoundHtml(locale: "mn" | "en") {
  const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  const home = locale === "en" ? "/en" : "/";
  const t = {
    title: m.NotFound.title,
    body: m.NotFound.description,
    back: m.Common.backHome,
    name: m.Common.clubName,
  };
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(t.title)} | ${escape(t.name)}</title>
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<style>
:root{color-scheme:light dark;--bg:${token("brand-paper")};--fg:${token("brand-ink")};--muted:${token("muted-foreground")};--accent:${token("brand-cyan-strong")};--btn:${token("brand-cyan")};--btn-fg:${token("brand-ink")}}
@media (prefers-color-scheme:dark){:root{--bg:${token("brand-night")};--fg:${darkToken("foreground")};--muted:${darkToken("muted-foreground")};--accent:${darkToken("brand-cyan-strong")}}.light{display:none}}
@media (prefers-color-scheme:light){.dark{display:none}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:2rem}
main{max-width:28rem}img{display:block;margin:0 auto 1.5rem}
.code{font-size:4.5rem;font-weight:800;line-height:1;color:var(--accent);margin:0}
h1{font-size:1.75rem;margin:1rem 0 .5rem}p{color:var(--muted);margin:0}
a.btn{display:inline-flex;align-items:center;min-height:44px;margin-top:2rem;padding:0 1.5rem;border-radius:999px;background:var(--btn);color:var(--btn-fg);font-weight:700;text-decoration:none}
a.btn:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
</style>
</head>
<body>
<main>
<img class="light" src="/brand/logo-mark-light.svg" alt="" width="120" height="120">
<img class="dark" src="/brand/logo-mark-dark.svg" alt="" width="120" height="120">
<p class="code">404</p>
<h1>${escape(t.title)}</h1>
<p>${escape(t.body)}</p>
<a class="btn" href="${home}">${escape(t.back)}</a>
</main>
</body>
</html>
`;
}

if (import.meta.main) {
  mkdirSync("public/errors", { recursive: true });
  writeFileSync("public/errors/404.html", notFoundHtml("mn"));
  writeFileSync("public/errors/404-en.html", notFoundHtml("en"));
  console.log("public/errors/404.html, public/errors/404-en.html");
}
