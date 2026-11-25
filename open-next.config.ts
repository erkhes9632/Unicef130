import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/**
 * Public pages are ISR: rendered once, then served from the cache (Free plan: 10 ms CPU per
 * request, a full render takes far more). See README → Performance & caching.
 * - R2 holds the pages, the Cache API keeps hot copies per data centre (regional cache).
 * - Cache interception answers hits before the Next.js server is even loaded.
 * - The tag cache (table `revalidations` in the main D1) marks pages stale after admin edits
 *   (`revalidateTag(..., "max")`): visitors get the cached page while a Durable Object queue
 *   re-renders it in the background, with retries.
 * https://opennext.js.org/cloudflare/caching
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
    // A hit must stay cheap: do not re-write the regional copy on every hit.
    shouldLazilyUpdateOnCacheHit: false,
  }),
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,
});
