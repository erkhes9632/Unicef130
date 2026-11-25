/**
 * Fills the page cache after a deploy (each deploy starts with an empty cache, and a first render
 * costs far more CPU than the Free plan's 10 ms — visitors should only ever get cached pages).
 * GET requests only; a page that fails (e.g. 503 / Error 1102) is retried.
 *
 *   bun run cache:warm                       # SITE_URL from wrangler.jsonc
 *   bun run cache:warm -- --url http://localhost:8787
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({ args: Bun.argv.slice(2), options: { url: { type: "string" } } });
const fromConfig = /"SITE_URL":\s*"([^"]+)"/.exec(readFileSync("wrangler.jsonc", "utf8"))?.[1];
const base = (values.url ?? fromConfig ?? "").replace(/\/+$/, "");
if (!base) throw new Error("No site URL: pass --url");

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => new URL(m[1]!).pathname,
);
// Cached pages that are not in the sitemap.
const extra = ["/sign-in", "/en/sign-in", "/join", "/en/join", "/contact", "/en/contact"];
const paths = [...new Set([...fromSitemap, ...extra])];

let failed = 0;
for (const path of paths) {
  let status = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    status = (await fetch(`${base}${path}`, { redirect: "manual" }).then((r) => {
      void r.body?.cancel();
      return r.status;
    })) as number;
    if (status < 500) break;
    await Bun.sleep(1000 * attempt);
  }
  if (status >= 500) failed++;
  console.log(`${status} ${path}`);
  await Bun.sleep(250);
}
console.log(`\n${paths.length} pages warmed, ${failed} still failing.`);
if (failed) process.exit(1);
