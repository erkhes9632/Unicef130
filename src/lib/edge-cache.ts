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
  for (const name of [
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
  const state = response.headers.get("x-opennext-cache");
  if (response.status !== 200 || !state || response.headers.has("set-cookie")) return null;
  if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) return null;
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
