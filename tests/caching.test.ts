/**
 * Free plan guard: public pages must stay cacheable (ISR). A request-time API in app/[locale]
 * would make every visit a full render (far over 10 ms CPU) — see README → Performance & caching.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { edgeCacheable, edgeKey, toEdgeCopy } from "@/lib/edge-cache";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Per-visitor pages (session or query string): rendered per request on purpose. */
const DYNAMIC = [
  "src/app/[locale]/join/page.tsx",
  "src/app/[locale]/me/page.tsx",
  "src/app/[locale]/me/certificate/page.tsx",
  "src/app/[locale]/search/page.tsx",
  "src/app/[locale]/sign-out/page.tsx",
];
/** Reads the session only when `signedIn` (the dynamic /join); /join/guest passes false. */
const GUARDED = ["src/app/[locale]/join/join-view.tsx"];

describe("cacheable public pages", () => {
  const files = walk("src/app/[locale]").filter((f) => /\.tsx?$/.test(f));

  test("no request-time APIs outside the per-visitor pages", () => {
    const bad = files
      .filter(
        (f) =>
          !DYNAMIC.includes(f) &&
          !GUARDED.includes(f) &&
          !f.includes("/me/") &&
          !f.endsWith("actions.ts"),
      )
      .filter((f) =>
        /\b(headers|cookies|connection)\(\)|searchParams|getCurrentUser\(|auth\(\)/.test(
          readFileSync(f, "utf8"),
        ),
      );
    expect(bad).toEqual([]);
  });

  test("per-visitor pages and the admin opt out of caching explicitly", () => {
    for (const f of [...DYNAMIC, "src/app/admin/layout.tsx"])
      expect(readFileSync(f, "utf8")).toContain('export const dynamic = "force-dynamic"');
  });

  test("the public root renders nothing per request", () => {
    const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
    expect(layout).toContain("generateStaticParams");
    expect(layout).toMatch(/export const revalidate = \d+/);
    expect(readFileSync("src/components/layout/root-document.tsx", "utf8")).not.toMatch(
      /headers\(\)|cookies\(\)/,
    );
  });
});

/**
 * /join and /sign-in: the cached HTML is the same for every signed-out visitor (Clerk runs in the
 * browser). Everything that depends on the session is decided per request: the proxy (rewrite to
 * /join/guest only without a session), the dynamic /join, and no data-centre copy at all.
 */
describe("session-dependent pages are never shared", () => {
  test("the data-centre copy skips account areas and keeps public pages", () => {
    const get = (path: string, headers: Record<string, string> = {}) =>
      edgeCacheable(new Request(`https://example.org${path}`, { headers }));
    for (const path of [
      "/join",
      "/en/join",
      "/mn/join",
      "/mn/sign-in",
      "/mn/me",
      "/sign-in",
      "/en/sign-in",
      "/sign-in/factor-one",
      "/me",
      "/en/me/certificate",
      "/admin",
      "/auth/continue",
      "/api/admin/stats",
      "/search",
    ])
      expect([path, get(path)]).toEqual([path, false]);
    expect(get("/en/about")).toBe(true);
    expect(get("/en/about", { rsc: "1" })).toBe(false);
    expect(get("/about?__clerk_handshake=x")).toBe(false);
  });

  test("responses with cookies, errors or no ISR state are never copied", () => {
    const html = { "content-type": "text/html; charset=utf-8", "x-opennext-cache": "HIT" };
    expect(toEdgeCopy(new Response("ok", { headers: html }), 60)).not.toBeNull();
    expect(
      toEdgeCopy(new Response("ok", { headers: { ...html, "set-cookie": "a=b" } }), 60),
    ).toBeNull();
    expect(toEdgeCopy(new Response("x", { status: 500, headers: html }), 60)).toBeNull();
    // A STALE page is being re-rendered: keeping it would hide the fresh one for EDGE_TTL.
    expect(
      toEdgeCopy(new Response("ok", { headers: { ...html, "x-opennext-cache": "STALE" } }), 60),
    ).toBeNull();
    expect(
      toEdgeCopy(new Response("ok", { headers: { "content-type": "text/html" } }), 60),
    ).toBeNull();
  });

  test("/join: the signed-in page is per request, the cached one is the signed-out view", () => {
    expect(readFileSync("src/app/[locale]/join/page.tsx", "utf8")).toContain("signedIn");
    expect(readFileSync("src/app/[locale]/join/guest/page.tsx", "utf8")).toContain(
      "signedIn={false}",
    );
    const proxy = readFileSync("src/proxy.ts", "utf8");
    expect(proxy).toMatch(/if \(join && !\(await auth\(\)\)\.userId\)/);
    for (const m of [
      '"/join"',
      '"/(en|mn)/join"',
      '"/sign-in/:path*"',
      '"/(en|mn)/sign-in/:path*"',
    ])
      expect(proxy).toContain(m);
  });
});

/**
 * Guard for the empty-500 fix (PROGRESS 2026-11-25): isolate-wide work must not start inside a
 * request, and a request a visitor leaves must still finish.
 */
describe("cold start stays out of requests", () => {
  const worker = readFileSync("worker.ts", "utf8");
  test("the server, routes and proxy load at isolate startup", () => {
    expect(worker).toMatch(/^await runWithCloudflareRequestContext\(/m);
    expect(worker).toContain('import("open-next-server")');
    expect(readFileSync("open-next.config.ts", "utf8")).toContain(
      'routePreloadingBehavior: "onStart"',
    );
  });
  test("every app response is finished even when the visitor leaves", () => {
    const calls = worker.match(/app\.fetch\(/g) ?? [];
    const wrapped = worker.match(/finishEvenIfCancelled\(ctx, app\.fetch\(/g) ?? [];
    expect(wrapped.length).toBe(calls.length);
  });
  test("cache:warm reads every response to the end", () => {
    const warm = readFileSync("scripts/warm-cache.ts", "utf8");
    expect(warm).toContain("arrayBuffer()");
    expect(warm).not.toContain("body?.cancel()");
  });
});

describe("data-centre copy key", () => {
  test("a new deploy never reads the previous deploy's copies", () => {
    const a = edgeKey("https://example.org/news?year=2025-2026", "v1").url;
    const b = edgeKey("https://example.org/news?year=2025-2026", "v2").url;
    expect(a).not.toBe(b);
    expect(new URL(a).searchParams.get("year")).toBe("2025-2026");
    expect(edgeKey("https://example.org/", undefined).url).toContain("__deploy=dev");
  });
  test("worker.ts and the instant refresh use the same key", () => {
    expect(readFileSync("worker.ts", "utf8")).toContain(
      "edgeKey(request.url, env.CF_VERSION_METADATA?.id)",
    );
    expect(readFileSync("src/lib/admin/revalidate.ts", "utf8")).toContain(
      "edgeKey(url, env.CF_VERSION_METADATA?.id)",
    );
  });
});
