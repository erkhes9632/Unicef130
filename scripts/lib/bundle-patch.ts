/**
 * Post-build patch of the OpenNext server bundle (unit-tested in tests/bundle-patch.test.ts).
 *
 * Next.js' ResponseCache shares a page render that is in progress with every other request for
 * the same page in the isolate (`Batcher`, one per route module). On Workers a request can be
 * stopped half-way (Error 1102: CPU limit on the Free plan). The stopped render never settles,
 * its `pending` entry is never deleted, and every later request for that page in that isolate
 * waits for it and fails with an empty 500 — until Cloudflare recycles the isolate. That was the
 * production-only outage after deploys (detail pages, /en, /sign-in answered 500 on every
 * request while other pages worked).
 *
 * The patch keeps the Batcher's own bookkeeping but never hands one request's promise to
 * another: each request renders (or reads the cache) itself. Concurrent cold requests for the
 * same page may render twice; a stopped request can only fail itself.
 */

export const UNSHARED_MARKER = "/*club130:unshared-render*/";

/** `let p=this.pending.get(k);if(p)return p;` in minified and in formatted source. */
const SHARED_PENDING =
  /\b(let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*this\.pending\.get\(\s*[A-Za-z_$][\w$]*\s*\);\s*if\s*\(\s*\2\s*\)\s*return\s+\2;/g;

/** Rewrites every Batcher share point; returns the new source and how many were patched. */
export function unshareBatchers(source: string): { code: string; patched: number } {
  let patched = 0;
  const code = source.replace(SHARED_PENDING, (_match, kind: string, name: string) => {
    patched += 1;
    return `${kind} ${name}=void 0${UNSHARED_MARKER};`;
  });
  return { code, patched };
}

/** Share points left unpatched (0 after a successful patch). */
export function sharedBatchers(source: string): number {
  return [...source.matchAll(SHARED_PENDING)].length;
}

/** Share points already patched (the patch is idempotent). */
export function unsharedBatchers(source: string): number {
  return source.split(UNSHARED_MARKER).length - 1;
}
