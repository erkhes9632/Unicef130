/**
 * Worker entry: the OpenNext app (fetch) plus a daily cron job (wrangler.jsonc → triggers).
 * Built by `opennextjs-cloudflare build` first, then bundled by wrangler with this file as main.
 *
 * Edge fast path (Free plan: 10 ms CPU per request): a plain GET for a public page is answered
 * from the data centre's Cache API copy when there is one, without loading the Next.js / OpenNext
 * code at all. Copies live for EDGE_TTL seconds, so admin edits show up within minutes (the
 * OpenNext cache behind it is refreshed right away, see src/lib/admin/revalidate.ts).
 */
import { drizzle } from "drizzle-orm/d1";
// The OpenNext bundle (.open-next/worker.js), typed in open-next-worker.d.ts.
import handler from "open-next-worker";
import * as schema from "./src/db/schema";
import { edgeCacheable, EDGE_TTL, fromEdgeCopy, toEdgeCopy } from "./src/lib/edge-cache";
import { logger } from "./src/lib/logger";
import { serveMedia } from "./src/lib/media/serve";
import { purgeExpiredRejected, purgeStaleRateLimits } from "./src/lib/recruitment/retention";

const app = handler;

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
    if (!edgeCacheable(request)) return app.fetch(request, env, ctx);
    const key = new Request(request.url, { method: "GET" });
    const hit = await cache.match(key);
    if (hit) return fromEdgeCopy(hit);
    const response = await app.fetch(request, env, ctx);
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
