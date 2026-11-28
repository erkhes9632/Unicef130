/**
 * The production-only 500s after deploys: Next.js' ResponseCache shared an in-progress render
 * between requests, so a render stopped by the Workers CPU limit blocked that page for every
 * later request of the isolate. scripts/patch-bundle.ts removes the sharing from the bundle.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { sharedBatchers, unshareBatchers, unsharedBatchers } from "../scripts/lib/bundle-patch";

const require = createRequire(import.meta.url);
const NEXT_DIST = join(process.cwd(), "node_modules/next/dist");
const BATCHER_FILE = join(NEXT_DIST, "lib/batcher.js");

type Batch = (key: unknown, fn: (arg: { resolve: (v: unknown) => void }) => unknown) => unknown;
type BatcherModule = { Batcher: { prototype: { batch: Batch } } };

/** Next's own Batcher module, compiled from (patched) source text. */
function loadBatcher(source: string): BatcherModule {
  const mod = { exports: {} as BatcherModule };
  const localRequire = createRequire(BATCHER_FILE);
  new Function("exports", "require", "module", source)(mod.exports, localRequire, mod);
  return mod.exports;
}

// A redirect entry: the simplest cache value ResponseCache passes through unchanged.
const PAGE = {
  value: { kind: "REDIRECT", props: {} },
  cacheControl: { revalidate: false, expire: undefined },
};
const CONTEXT = {
  incrementalCache: null,
  isOnDemandRevalidate: false,
  isFallback: false,
  isRoutePPREnabled: false,
  isPrefetch: false,
};

type ResponseCacheLike = {
  get(key: string, generate: () => Promise<unknown>, ctx: typeof CONTEXT): Promise<unknown>;
};

/** Request A's render never settles (stopped by the CPU limit); does request B still get the page? */
async function laterRequestAfterStoppedRender(batch: Batch): Promise<"rendered" | "stuck"> {
  const real = require(BATCHER_FILE) as BatcherModule;
  const original = real.Batcher.prototype.batch;
  real.Batcher.prototype.batch = batch;
  try {
    const { default: ResponseCache } = require(
      join(NEXT_DIST, "server/response-cache/index.js"),
    ) as { default: new (o: { minimalMode: boolean; route: string }) => ResponseCacheLike };
    const cache = new ResponseCache({ minimalMode: true, route: "/[locale]/events/[slug]" });
    void cache.get("/events/x", () => new Promise(() => {}), CONTEXT);
    const later = cache.get("/events/x", async () => PAGE, CONTEXT).then(() => "rendered" as const);
    const timeout = new Promise<"stuck">((resolve) => setTimeout(() => resolve("stuck"), 300));
    return await Promise.race([later, timeout]);
  } finally {
    real.Batcher.prototype.batch = original;
  }
}

describe("bundle patch: no render shared between requests", () => {
  const source = readFileSync(BATCHER_FILE, "utf8");

  test("unpatched Next.js: a stopped render blocks the page for later requests (the bug)", async () => {
    expect(await laterRequestAfterStoppedRender(loadBatcher(source).Batcher.prototype.batch)).toBe(
      "stuck",
    );
  });

  test("patched: the later request renders the page itself", async () => {
    const { code, patched } = unshareBatchers(source);
    expect(patched).toBe(1);
    expect(await laterRequestAfterStoppedRender(loadBatcher(code).Batcher.prototype.batch)).toBe(
      "rendered",
    );
  });

  test("patched Batcher still resolves early (stale-while-revalidate) and runs fn per call", async () => {
    const { Batcher } = loadBatcher(unshareBatchers(source).code) as unknown as {
      Batcher: { create(): { batch: Batch } };
    };
    const batcher = Batcher.create();
    let calls = 0;
    const early = await batcher.batch("k", ({ resolve }) => {
      calls += 1;
      resolve("stale");
      return new Promise(() => {});
    });
    const second = await batcher.batch("k", async () => {
      calls += 1;
      return "fresh";
    });
    expect([early, second, calls]).toEqual(["stale", "fresh", 2]);
  });

  test("every Next.js server runtime copy has exactly one share point the patch finds", () => {
    const compiled = join(NEXT_DIST, "compiled/next-server");
    const files = [
      BATCHER_FILE,
      join(NEXT_DIST, "esm/lib/batcher.js"),
      ...readdirSync(compiled)
        .filter((f) => /^(app-page|app-route)[\w-]*\.runtime\.prod\.js$/.test(f))
        .map((f) => join(compiled, f)),
    ];
    expect(files.length).toBeGreaterThan(4);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const { code, patched } = unshareBatchers(text);
      expect({ file, patched }).toEqual({ file, patched: 1 });
      expect(sharedBatchers(code)).toBe(0);
      // Idempotent: a second run changes nothing.
      expect(unshareBatchers(code)).toEqual({ code, patched: 0 });
      expect(unsharedBatchers(code)).toBe(1);
    }
  });

  test("the built Worker bundle is patched (after `bun run cf:build`)", () => {
    const bundle = ".open-next/server-functions/default/handler.mjs";
    if (!existsSync(bundle)) return; // no build in this checkout
    const text = readFileSync(bundle, "utf8");
    expect(sharedBatchers(text)).toBe(0);
    expect(unsharedBatchers(text)).toBeGreaterThan(0);
  });

  test("every build path runs the patch", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["cf:build"]).toContain("scripts/patch-bundle.ts");
    for (const name of ["preview", "deploy", "upload"])
      expect(pkg.scripts[name]).toStartWith("bun run cf:build");
    expect(readFileSync("scripts/release.ts", "utf8")).toContain('"cf:build"');
  });
});
