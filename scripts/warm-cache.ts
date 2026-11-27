/**
 * Fills the page cache after a deploy (each deploy starts with an empty cache, and a first render
 * costs far more CPU than the Free plan's 10 ms — visitors should only ever get cached pages).
 * GET requests only, one at a time, a second apart. Each response is read to the end: dropping
 * the connection early cancels the request, and with it the render that would have filled the
 * cache. A page that answers 5xx is retried once, 8 s later.
 *
 * If any page still fails, the script FAILS (exit 1) and prints the status, the Cloudflare ray id
 * and the response body of the first failing page, plus the rollback command: the new version is
 * already live at that point, so `bun run deploy` stops here and says so loudly.
 *
 *   bun run cache:warm                       # SITE_URL from wrangler.jsonc
 *   bun run cache:warm -- --url http://localhost:8787
 *   bun run cache:warm -- --version <id>     # an uploaded version at 0 % (release pre-warm)
 */
import { parseArgs } from "node:util";
import {
  describeFailure,
  publicPaths,
  siteConfig,
  type Failure,
  versionHeaders,
  visit,
} from "./lib/site-check";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { url: { type: "string" }, version: { type: "string" } },
});
const base = (values.url ?? siteConfig().siteUrl).replace(/\/+$/, "");
// --version <id>: check an uploaded version that is not live yet (release pre-warm).
const headers = versionHeaders(values.version);
const pinned = !!values.version;
if (!base) throw new Error("No site URL: pass --url");

const paths = await publicPaths(base, headers);
const failed: Failure[] = [];
for (const path of paths) {
  let result = await visit(base, path, headers);
  if (result.status === 0 || result.status >= 500) {
    // A render stopped for CPU can leave its isolate unusable for a moment: give it time.
    await Bun.sleep(8000);
    const retry = await visit(base, path, headers);
    console.log(`${result.status || "ERR"} ${path} → retry ${retry.status || "ERR"}`);
    result = retry;
  } else console.log(`${result.status} ${path}`);
  if (result.status === 0 || result.status >= 500) failed.push(result);
  // One render at a time, spaced out: on the Free plan every first render is far over 10 ms of
  // CPU, and a steady stream of them in one isolate is what gets stopped (Error 1102).
  await Bun.sleep(1000);
}

console.log(`\n${paths.length} pages warmed.`);
if (failed.length) {
  console.error(
    describeFailure(
      "cache:warm",
      base,
      failed,
      pinned ? [`Version ${values.version} is NOT live: visitors were not affected.`] : undefined,
    ),
  );
  process.exit(1);
}
