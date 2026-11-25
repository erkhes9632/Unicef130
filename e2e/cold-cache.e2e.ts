import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * The first request after a deploy (empty page cache, fresh isolate) must answer 200 for every
 * public page, mn and en — including /join and /sign-in, which go through the proxy first.
 *
 * The preview on :8787 already has a warm cache, so this test starts its own Worker on :8790 with
 * a copy of the local data (D1 + R2) and no Cache API state, then expires every cached page the
 * way an admin save does (tag `_N_T_/[locale]/layout` in the tag cache). Requests go out a few at
 * a time, like real traffic. Needs a build: `bun run preview` (or `bun run cf:build`) first.
 *
 * Local workerd does not enforce the 10 ms CPU limit, so this guards the cold path (startup
 * preload, first render, proxy) rather than CPU time — see README → Performance & caching.
 */
const PORT = 8790;
const BASE = `http://localhost:${PORT}`;
const STATE = ".wrangler/state/v3";
const PUBLIC_PAGES_TAG = "_N_T_/[locale]/layout";
/** Cached pages that the sitemap does not list. */
const EXTRA = ["/sign-in", "/en/sign-in", "/join", "/en/join", "/contact", "/en/contact"];

let dir = "";
let worker: ChildProcess | undefined;

function wrangler(args: string[]) {
  const run = spawnSync("bunx", ["wrangler", ...args], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`wrangler ${args[0]} failed:\n${run.stderr}`);
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  if (!existsSync(".open-next/worker.js") || !existsSync(".next/BUILD_ID"))
    throw new Error("No Worker build: run `bun run preview` or `bun run cf:build` first.");
  dir = mkdtempSync(join(tmpdir(), "cold-cache-"));
  for (const part of ["d1", "r2"])
    cpSync(join(STATE, part), join(dir, "v3", part), { recursive: true });
  const buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
  const now = Date.now();
  wrangler([
    "d1",
    "execute",
    "DB",
    "--local",
    "--persist-to",
    dir,
    "--command",
    `INSERT OR REPLACE INTO revalidations (tag, revalidatedAt, stale, expire) VALUES ('${buildId}/${PUBLIC_PAGES_TAG}', ${now}, NULL, NULL)`,
  ]);
  worker = spawn("bunx", ["wrangler", "dev", "--port", String(PORT), "--persist-to", dir], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Worker did not start:\n${log}`)), 120_000);
    const onData = (chunk: Buffer) => {
      log += chunk.toString();
      if (log.includes("Ready on")) {
        clearTimeout(timer);
        resolve();
      }
    };
    worker!.stdout!.on("data", onData);
    worker!.stderr!.on("data", onData);
    worker!.on("exit", (code) => reject(new Error(`Worker exited (${code}):\n${log}`)));
  });
});

test.afterAll(() => {
  worker?.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test("first request after a cache purge: 200 for every public page (mn + en)", async () => {
  test.setTimeout(300_000);
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [
    ...new Set([
      ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname),
      ...EXTRA,
    ]),
  ];
  expect(paths.length).toBeGreaterThan(20);
  expect(paths.some((p) => p.startsWith("/en"))).toBe(true);

  const results: { path: string; status: number; cache: string }[] = [];
  for (let i = 0; i < paths.length; i += 4) {
    const batch = await Promise.all(
      paths.slice(i, i + 4).map(async (path) => {
        const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
        await response.arrayBuffer();
        return {
          path,
          status: response.status,
          cache:
            response.headers.get("x-edge-cache") ?? response.headers.get("x-opennext-cache") ?? "-",
        };
      }),
    );
    results.push(...batch);
  }
  // Every page answered on its first request, and none came from a cache that should be empty.
  expect(results.filter((r) => r.status !== 200)).toEqual([]);
  expect(results.filter((r) => r.cache === "HIT")).toEqual([]);
});
