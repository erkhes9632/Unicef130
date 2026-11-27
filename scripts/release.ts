/**
 * Safe production release (replaces `bun run deploy` for production):
 *
 *   1. build, then upload a new Worker version (not live; fills the remote page cache for it)
 *   2. deploy it at 0 % next to the live version (visitors stay on the live one)
 *   3. warm every public page ON THE NEW VERSION (cache:warm --version), so it goes live with a
 *      full cache instead of a burst of first renders
 *   4. smoke-test the new version (twice, every public page mn + en, /sign-in, /join)
 *   5. only then give it 100 %, and smoke-test the live site
 *
 * If step 3 or 4 fails, the new version is removed again (live version back to 100 % alone):
 * visitors never saw it. If step 5's check fails, it prints the rollback command.
 * Requests for a pinned version carry `Cloudflare-Workers-Version-Overrides`; the Worker never
 * stores a data-centre copy for them (src/lib/edge-cache.ts).
 *
 *   bun run release             # needs `bunx wrangler login` with the club's account
 *   bun run release -- --dry-run
 */
import { parseArgs } from "node:util";
import { parseLiveVersion, parseUploadedVersion, releaseSteps } from "./lib/release-plan";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { "dry-run": { type: "boolean" } },
});
const dryRun = !!values["dry-run"];

/** Runs a command with the output shown live; returns exit code and the captured output. */
async function run(cmd: string[]): Promise<{ code: number; output: string }> {
  console.log(`\n$ ${cmd.join(" ")}`);
  if (dryRun) return { code: 0, output: "" };
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  let output = "";
  const pump = async (stream: ReadableStream<Uint8Array>, out: NodeJS.WriteStream) => {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      output += text;
      out.write(text);
    }
  };
  await Promise.all([pump(proc.stdout, process.stdout), pump(proc.stderr, process.stderr)]);
  return { code: await proc.exited, output };
}

function stop(message: string): never {
  console.error(`\n${"=".repeat(72)}\n${message}\n${"=".repeat(72)}`);
  process.exit(1);
}

const status = await run(["bunx", "wrangler", "deployments", "status", "--json"]);
const live = dryRun
  ? "<live-version>"
  : parseLiveVersion(status.output.slice(status.output.indexOf("{")));
if (!live)
  stop(
    "✘ Could not tell which version is live (expected one version at 100 %). Nothing was changed.",
  );

if ((await run(["bunx", "opennextjs-cloudflare", "build"])).code !== 0)
  stop("✘ Build failed. Nothing was changed.");
const upload = await run(["bunx", "opennextjs-cloudflare", "upload"]);
const next = dryRun ? "<new-version>" : parseUploadedVersion(upload.output);
if (upload.code !== 0 || !next) stop("✘ Upload failed. Nothing went live.");

const steps = releaseSteps(live, next);
if ((await run(steps.pin)).code !== 0)
  stop(`✘ Could not add ${next} at 0 %. Nothing went live (still ${live}).`);

for (const [name, cmd] of [
  ["cache:warm on the new version", steps.warm],
  ["smoke test on the new version", steps.check],
] as const) {
  if ((await run(cmd)).code !== 0) {
    await run(steps.unpin);
    stop(
      `✘ ${name} FAILED. The new version ${next} was NOT made live; ${live} serves 100 %.\n` +
        `Debug the new version (still uploaded) with:\n` +
        `  bunx wrangler tail --format json --status error\n` +
        `  bun run smoke -- --version ${next}   # after re-adding it at 0 %:\n` +
        `  bunx wrangler versions deploy ${live}@100% ${next}@0% --yes`,
    );
  }
}

if ((await run(steps.promote)).code !== 0)
  stop(`✘ Could not make ${next} live. ${live} still serves 100 %.`);
if ((await run(steps.smokeLive)).code !== 0)
  stop(`✘ The LIVE smoke test failed after the switch. Roll back now:\n  ${steps.rollback}`);

console.log(`\n✓ Released ${next} (previous: ${live}). Roll back with: ${steps.rollback}`);
