/**
 * Data-centre copy of cached public pages (Workers Cache API), used by worker.ts before the
 * OpenNext app is even called. Only plain GETs of public HTML pages that came out of the ISR
 * cache are copied; account areas, API, RSC/Server Action requests and files never are.
 */
export const EDGE_TTL = 120;

const NOT_A_PUBLIC_PAGE =
  /^\/(?:(?:en|mn)\/)?(?:me|join|sign-in|sign-out|search)(?:\/|$)|^\/(?:admin|api|auth|media|brand|_next|cdn-cgi)(?:\/|$)/;
const ORIGINAL_CACHE_CONTROL = "x-origin-cache-control";

export function edgeCacheable(request: Request) {
  if (request.method !== "GET") return false;
  const h = request.headers;
  // RSC navigations, Server Actions and the background re-render (x-prerender-revalidate)
  // always reach the app.
  // A request pinned to a not-yet-live version (release pre-warm, see scripts/release.ts) must
  // neither read nor leave a copy: the copy would be served to visitors of the live version.
  for (const name of [
    "cloudflare-workers-version-overrides",
    "rsc",
    "next-action",
    "next-router-prefetch",
    "next-router-state-tree",
    "x-prerender-revalidate",
  ])
    if (h.has(name)) return false;
  const url = new URL(request.url);
  if (
    url.searchParams.has("_rsc") ||
    [...url.searchParams.keys()].some((k) => k.startsWith("__clerk"))
  )
    return false;
  return !NOT_A_PUBLIC_PAGE.test(url.pathname) && !/\.[^/]+$/.test(url.pathname);
}

/** A copy to store, or null when the response must not be shared (not an ISR page, cookies…). */
export function toEdgeCopy(response: Response, ttl: number): Response | null {
  // Only fresh pages: a STALE one is being re-rendered right now and must not be kept for
  // EDGE_TTL after the fresh version exists.
  const state = response.headers.get("x-opennext-cache");
  if (response.status !== 200 || state !== "HIT" || response.headers.has("set-cookie")) return null;
  if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) return null;
  const copy = new Response(response.clone().body, response);
  copy.headers.set(ORIGINAL_CACHE_CONTROL, response.headers.get("cache-control") ?? "");
  copy.headers.set("cache-control", `public, max-age=${ttl}`);
  copy.headers.delete("vary");
  return copy;
}

/**
 * Crawler files built from D1 on every request (`force-dynamic`: 45–80 ms of CPU each in
 * production, far over the Free plan's 10 ms). The data-centre copy serves them for FILE_TTL.
 * Not ISR on purpose: a build-time prerender would bake the local database into production.
 */
export const FILE_TTL = 600;
const CRAWLER_FILES = new Set(["/sitemap.xml", "/robots.txt"]);

export function fileCacheable(request: Request) {
  if (request.method !== "GET") return false;
  if (request.headers.has("cloudflare-workers-version-overrides")) return false;
  const url = new URL(request.url);
  return CRAWLER_FILES.has(url.pathname) && url.search === "";
}

/** A copy of a crawler file to store, or null (errors, cookies). */
export function toFileCopy(response: Response, ttl: number): Response | null {
  if (response.status !== 200 || response.headers.has("set-cookie")) return null;
  const copy = new Response(response.clone().body, response);
  copy.headers.set(ORIGINAL_CACHE_CONTROL, response.headers.get("cache-control") ?? "");
  copy.headers.set("cache-control", `public, max-age=${ttl}`);
  copy.headers.delete("vary");
  return copy;
}

/** The stored copy as sent to the browser (original Cache-Control restored). */
export function fromEdgeCopy(hit: Response): Response {
  const out = new Response(hit.body, hit);
  out.headers.set("cache-control", hit.headers.get(ORIGINAL_CACHE_CONTROL) || "private, no-cache");
  out.headers.delete(ORIGINAL_CACHE_CONTROL);
  out.headers.set("x-edge-cache", "HIT");
  return out;
}
