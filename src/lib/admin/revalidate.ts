import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/seo";

/**
 * Public pages (app/[locale]) are cached. After an admin edit they are marked stale with
 * stale-while-revalidate semantics ("max"): visitors keep getting the cached page while a
 * background job re-renders it, so no visitor waits for (or fails on) a full render on the
 * Free plan's 10 ms CPU budget. Every public page carries this implicit layout tag.
 */
export const PUBLIC_PAGES_TAG = "_N_T_/[locale]/layout";

export function revalidatePublic() {
  revalidateTag(PUBLIC_PAGES_TAG, "max");
}

/**
 * For changes an admin checks right away (a member's name shown or hidden): besides marking
 * every public page stale, the given pages are refreshed at once — their data-centre copy is
 * dropped and one request (through the Worker itself) starts the background re-render, so the
 * public page shows the change within seconds instead of on the next visit after that.
 * Runs after the response (`after`), when the stale mark is already stored.
 */
export function refreshPublicPages(paths: string[]) {
  revalidatePublic();
  after(async () => {
    try {
      const [{ env }, origin] = await Promise.all([
        getCloudflareContext({ async: true }),
        getSiteUrl(),
      ]);
      const cache = (caches as unknown as { default: Cache }).default;
      for (const path of paths)
        for (const url of [`${origin}${path}`, `${origin}/en${path === "/" ? "" : path}`]) {
          await cache.delete(new Request(url));
          const res = await env.WORKER_SELF_REFERENCE?.fetch(url);
          await res?.arrayBuffer();
        }
    } catch (err) {
      logger.warn("revalidate", "refresh of public pages failed", err);
    }
  });
}
