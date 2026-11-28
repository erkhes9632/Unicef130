/**
 * Runs after `opennextjs-cloudflare build` (part of `bun run cf:build`, so preview, upload,
 * release and deploy all ship the same patched bundle). See scripts/lib/bundle-patch.ts.
 * Fails the build when the bundle has no Batcher to patch (Next.js changed: re-check the fix)
 * or when one is left unpatched.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { sharedBatchers, unshareBatchers, unsharedBatchers } from "./lib/bundle-patch";

const SERVER_BUNDLE = ".open-next/server-functions/default/handler.mjs";

const source = readFileSync(SERVER_BUNDLE, "utf8");
const { code, patched } = unshareBatchers(source);
const total = unsharedBatchers(code);
if (total === 0 || sharedBatchers(code) > 0) {
  console.error(
    `✘ patch-bundle: expected Next.js Batcher share points in ${SERVER_BUNDLE} ` +
      `(patched ${patched}, left ${sharedBatchers(code)}). Next.js changed: re-check the fix.`,
  );
  process.exit(1);
}
if (patched > 0) writeFileSync(SERVER_BUNDLE, code);
console.log(`✓ patch-bundle: ${total} render share point(s) unshared in ${SERVER_BUNDLE}`);
