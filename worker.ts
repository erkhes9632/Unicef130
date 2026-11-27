/**
 * Worker entry: the OpenNext app (fetch) plus a daily cron job (wrangler.jsonc → triggers).
 * Built by `opennextjs-cloudflare build` first, then bundled by wrangler with this file as main.
 *
 * Edge fast path (Free plan: 10 ms CPU per request): a plain GET for a public page is answered
 * from the data centre's Cache API copy when there is one, without loading the Next.js / OpenNext
 * code at all. Copies live for EDGE_TTL seconds, so admin edits show up within minutes (the
 * OpenNext cache behind it is refreshed right away, see src/lib/admin/revalidate.ts).
 *
 * Startup: the Next.js server and every route module (`routePreloadingBehavior: "onStart"`) are
 * loaded when the isolate starts, not by the first request. Loaded lazily, that work cost a cold
 * request ~170 ms of CPU. When Cloudflare stopped such a request (Error 1102), the isolate-wide
 * promises it had started (Next's `prepare()`, module loading, the shared render) could never
 * settle, and the other requests of that isolate failed with an empty 500 ("This promise was
 * created by a request that has since ended"). Startup has its own CPU limit and belongs to no
 * request. It runs inside OpenNext's own request context (env, process.env, globals) because the
 * server bundle expects it; the URL only seeds `OPEN_NEXT_ORIGIN`, which nothing reads.
 */
import { env as startupEnv } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
// The OpenNext bundle (.open-next/*), typed in open-next-worker.d.ts.
import { runWithCloudflareRequestContext } from "open-next-init";
import handler from "open-next-worker";
import * as schema from "./src/db/schema";
import { edgeCacheable, edgeKey, EDGE_TTL, fromEdgeCopy, toEdgeCopy } from "./src/lib/edge-cache";
import { finishEvenIfCancelled } from "./src/lib/finish-request";
import { logger } from "./src/lib/logger";
import { serveMedia } from "./src/lib/media/serve";
import { checkRoute, notFoundPath, type RouteCheck } from "./src/lib/not-found-route";
import { purgeExpiredRejected, purgeStaleRateLimits } from "./src/lib/recruitment/retention";

const app = handler;

/** No request at startup: background work would have nowhere to go (preloading starts none). */
const startupContext = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

const origin = startupEnv.SITE_URL || "http://localhost";

/**
 * Every request the app sees carries a Host header. Requests built inside the Worker (startup,
 * a page refresh through WORKER_SELF_REFERENCE) have none, and OpenNext puts the Host into the
 * background re-render message: without it the Durable Object failed with
 * "Cannot read properties of undefined (reading 'includes')" and stale pages never refreshed.
 */
function withHost(request: Request): Request {
  if (request.headers.get("host")) return request;
  const copy = new Request(request);
  copy.headers.set("host", new URL(request.url).host);
  return copy;
}
await runWithCloudflareRequestContext(
  new Request(origin),
  startupEnv,
  startupContext,
  () => import("open-next-server"),
);
// The proxy (src/proxy.ts, Clerk) is loaded by its first call: a signed-out /admin only gets a
// redirect to /sign-in from it (no D1, R2 or network). Timers are not allowed at startup and
// Next.js schedules one clean-up callback with setTimeout(…, 0): it runs as a microtask instead.
// Never fatal: worst case the first real account-area request loads the proxy.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((callback: () => void) => {
  queueMicrotask(callback);
  return 0;
}) as unknown as typeof setTimeout;
try {
  const warm = await handler.fetch(
    withHost(new Request(`${origin}/admin`)),
    startupEnv,
    startupContext,
  );
  await warm.body?.cancel();
} catch {
  // ignored, see above
} finally {
  globalThis.setTimeout = realSetTimeout;
}

/** Whether a detail page's slug (or an old slug that redirects) exists. Errors: let the app decide. */
async function slugExists(db: D1Database, route: Extract<RouteCheck, { kind: "slug" }>) {
  try {
    const row = await db
      .prepare(
        `SELECT 1 FROM ${route.table} WHERE slug = ?1 UNION ALL SELECT 1 FROM slug_redirects WHERE kind = ?2 AND from_slug = ?1 LIMIT 1`,
      )
      .bind(route.slug, route.table)
      .first();
    return row !== null;
  } catch {
    return true;
  }
}

/**
 * Unknown URLs: the static 404 page of the locale (public/errors, built by
 * scripts/build-404.ts) with status 404. A file read — no database, no sign-in code, no
 * rendering — so it can never fail or use CPU.
 */
async function staticNotFound(request: Request, locale: "mn" | "en", env: CloudflareEnv) {
  const file = env.ASSETS
    ? await env.ASSETS.fetch(new URL(notFoundPath(locale), request.url))
    : new Response("404", { status: 404 });
  const headers = new Headers(file.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(request.method === "HEAD" ? null : file.body, { status: 404, headers });
}

export default {
  async fetch(request, env, ctx) {
    // Workers' default cache (the DOM CacheStorage type in tsconfig does not know `default`).
    const cache = (caches as unknown as { default: Cache }).default;
    const url = new URL(request.url);
    // Images: straight from R2 (+ the data-centre cache), never through the app.
    if (request.method === "GET" && url.pathname.startsWith("/media/")) {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await serveMedia(env.MEDIA, url.pathname.slice(7), request);
      if (response.status === 200) ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }
    // Unknown public URLs (bots, typos, removed pages): the shared 404 page, no new render.
    const route: RouteCheck =
      request.method === "GET" || request.method === "HEAD"
        ? checkRoute(url.pathname)
        : { kind: "app" };
    if (route.kind === "missing") return staticNotFound(request, route.locale, env);
    const missingSlug = async () => route.kind === "slug" && !(await slugExists(env.DB, route));

    if (!edgeCacheable(request)) {
      if (route.kind === "slug" && (await missingSlug()))
        return staticNotFound(request, route.locale, env);
      return finishEvenIfCancelled(ctx, app.fetch(withHost(request), env, ctx));
    }
    const key = edgeKey(request.url, env.CF_VERSION_METADATA?.id);
    const hit = await cache.match(key);
    if (hit) return fromEdgeCopy(hit);
    // Only checked when the page is not in the data-centre cache (existing pages usually are).
    if (route.kind === "slug" && (await missingSlug()))
      return staticNotFound(request, route.locale, env);
    const response = await finishEvenIfCancelled(ctx, app.fetch(withHost(request), env, ctx));
    const copy = toEdgeCopy(response, EDGE_TTL);
    if (copy) ctx.waitUntil(cache.put(key, copy));
    return response;
  },
  async scheduled(_controller, env, ctx) {
    const db = drizzle(env.DB, { schema });
    ctx.waitUntil(
      purgeExpiredRejected(db).then(
        (n) => logger.info("retention", "deleted expired rejected applications", { count: n }),
        (err) => logger.error("retention", "failed", err),
      ),
    );
    ctx.waitUntil(
      purgeStaleRateLimits(db).catch((err) =>
        logger.error("retention", "rate-limit clean-up failed", err),
      ),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "open-next-worker";
