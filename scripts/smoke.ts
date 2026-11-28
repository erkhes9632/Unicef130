/**
 * Post-deploy smoke test against the LIVE site (runs at the end of `bun run deploy`, after
 * `cache:warm`). Every public section in mn and en, every detail page from the sitemap, /sign-in
 * and /join — each requested twice, the second round a few seconds after the first, because a
 * broken render first answers 503 (Error 1102) and then 500 on every later request.
 *
 * Any 5xx in the second round (or twice in a row for the same address) fails with exit 1, the
 * body of the first failure and the command to roll back. GET requests only.
 *
 * Then a signed-out browser check (scripts/lib/clerk-check.ts): the Clerk sign-in card must
 * appear within 10 s on /sign-in, /en/sign-in, after clicking «Нэвтрэх» on / and /en, and on
 * /join (+ en). The HTML can be fine while clerk-js is blocked in the browser (2026-11-28).
 *
 *   bun run smoke                            # SITE_URL from wrangler.jsonc
 *   bun run smoke -- --url http://localhost:8787
 *   bun run smoke -- --version <id>          # an uploaded version at 0 % (release check)
 */
import { parseArgs } from "node:util";
import { checkClerkWidgets } from "./lib/clerk-check";
import {
  describeFailure,
  publicPaths,
  type Result,
  siteConfig,
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
const bad = (r: Result) => r.status === 0 || r.status >= 500;

/** A few at a time, like normal traffic (the cache is warm; each answer is a cached page). */
async function round(): Promise<Result[]> {
  const out: Result[] = [];
  for (let i = 0; i < paths.length; i += 4)
    out.push(...(await Promise.all(paths.slice(i, i + 4).map((p) => visit(base, p, headers)))));
  return out;
}

const first = await round();
await Bun.sleep(5000);
const second = await round();

const failed = second.filter(bad);
const flaky = first.filter((r) => bad(r) && !failed.some((f) => f.path === r.path));
for (const r of second) console.log(`${r.status || "ERR"} ${r.path}`);
console.log(`\n${paths.length} addresses checked twice.`);
if (flaky.length)
  console.log(
    `Recovered on the second try (watch \`bunx wrangler tail --status error\`): ${flaky.map((r) => `${r.status} ${r.path}`).join(", ")}`,
  );
if (failed.length) {
  console.error(
    describeFailure(
      "smoke test",
      base,
      failed,
      pinned ? [`Version ${values.version} is NOT live: visitors were not affected.`] : undefined,
    ),
  );
  process.exit(1);
}
console.log("✓ No 5xx on any public page, /sign-in or /join (mn + en).");

const clerk = await checkClerkWidgets(base, headers);
if (clerk.length) {
  console.error(
    [
      "",
      "=".repeat(72),
      `✘ smoke test FAILED on ${base}: the Clerk sign-in card did not appear (signed out).`,
      "=".repeat(72),
      ...clerk.map((f) => `  ${f}`),
      "",
      pinned
        ? `Version ${values.version} is NOT live: visitors were not affected.`
        : "If this version was just released, roll back now (`bun run release` prints the command).",
      "=".repeat(72),
    ].join("\n"),
  );
  process.exit(1);
}
console.log("✓ Smoke test passed: no 5xx, and the Clerk sign-in card appears (signed out).");
