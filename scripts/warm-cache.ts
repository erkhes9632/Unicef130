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
 *   bun run cache:warm -- --pause 12         # seconds between pages (default 1)
 *
 * Pacing: the Free plan tolerates first renders over 10 ms only up to a burst budget (about
 * 30–50 renders), then stops every request over 10 ms until it refills over the next minutes
 * (seen 2026-11-27/28: `exceededCpu` at exactly 10 ms on every render after ~35). `bun run
 * release` therefore warms with `--pause 12`, and a 5xx is retried after 30 s and 60 s.
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
  options: {
    url: { type: "string" },
    version: { type: "string" },
    pause: { type: "string" },
  },
});
const base = (values.url ?? siteConfig().siteUrl).replace(/\/+$/, "");
// --version <id>: check an uploaded version that is not live yet (release pre-warm).
const headers = versionHeaders(values.version);
const pinned = !!values.version;
if (!base) throw new Error("No site URL: pass --url");

const pauseMs = Math.max(0, Number(values.pause ?? 1)) * 1000;
const RETRY_AFTER_MS = [30_000, 60_000];

const paths = await publicPaths(base, headers);
const failed: Failure[] = [];
for (const path of paths) {
  let result = await visit(base, path, headers);
  const tries = [`${result.status || "ERR"}`];
  for (const wait of RETRY_AFTER_MS) {
    if (result.status !== 0 && result.status < 500) break;
    // Stopped for CPU (1102): the budget refills over time; a later try usually renders.
    await Bun.sleep(wait);
    result = await visit(base, path, headers);
    tries.push(`${result.status || "ERR"}`);
  }
  console.log(`${tries.join(" → retry ")} ${path}`);
  if (result.status === 0 || result.status >= 500) failed.push(result);
  // One render at a time, spaced out (see Pacing above).
  await Bun.sleep(pauseMs);
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
