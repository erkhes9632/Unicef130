/**
 * Fills the page cache after a deploy (each deploy starts with an empty cache, and a first render
 * costs far more CPU than the Free plan's 10 ms — visitors should only ever get cached pages).
 * GET requests only, one at a time, a second apart. Each response is read to the end: dropping
 * the connection early cancels the request, and with it the render that would have filled the
 * cache. A page that answers 5xx is retried once, 8 s later; pages that still fail are listed, and the
 * script exits 0 (the deploy itself succeeded — run it again later).
 *
 *   bun run cache:warm                       # SITE_URL from wrangler.jsonc
 *   bun run cache:warm -- --url http://localhost:8787
 *   bun run cache:warm -- --strict           # exit 1 if a page still fails (for local checks)
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { url: { type: "string" }, strict: { type: "boolean" } },
});
const fromConfig = /"SITE_URL":\s*"([^"]+)"/.exec(readFileSync("wrangler.jsonc", "utf8"))?.[1];
const base = (values.url ?? fromConfig ?? "").replace(/\/+$/, "");
if (!base) throw new Error("No site URL: pass --url");

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => new URL(m[1]!).pathname,
);
// Cached pages that are not in the sitemap (/join = the signed-out view; the proxy runs first).
const extra = ["/sign-in", "/en/sign-in", "/join", "/en/join"];
const paths = [...new Set([...fromSitemap, ...extra])];

/** Status after reading the whole body (0 = network error). */
async function visit(path: string): Promise<number> {
  try {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    await response.arrayBuffer();
    return response.status;
  } catch {
    return 0;
  }
}

const failed: string[] = [];
for (const path of paths) {
  let status = await visit(path);
  if (status === 0 || status >= 500) {
    // A render stopped for CPU can leave its isolate unusable for a moment: give it time.
    await Bun.sleep(8000);
    const retry = await visit(path);
    console.log(`${status || "ERR"} ${path} → retry ${retry || "ERR"}`);
    status = retry;
  } else console.log(`${status} ${path}`);
  if (status === 0 || status >= 500) failed.push(`${status || "ERR"} ${path}`);
  // One render at a time, spaced out: on the Free plan every first render is far over 10 ms of
  // CPU, and a steady stream of them in one isolate is what gets stopped (Error 1102).
  await Bun.sleep(1000);
}

console.log(`\n${paths.length} pages warmed.`);
if (failed.length) {
  console.log(`Still failing after a retry (${failed.length}):`);
  for (const line of failed) console.log(`  ${line}`);
  console.log("Check `bunx wrangler tail --status error`, then run `bun run cache:warm` again.");
  if (values.strict) process.exit(1);
}
