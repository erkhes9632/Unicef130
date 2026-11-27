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
 * Free plan's 10 ms CPU budget.
 *
 * Only the pages that show the edited content are marked: every re-render costs 40–280 ms of
 * CPU in production, and marking the whole site after each edit started one re-render per page
 * in a burst. Every page carries implicit tags per route segment (e.g.
 * `_N_T_/[locale]/news/layout` for /news and /news/[slug], `_N_T_/[locale]/page` for home).
 */
export const PUBLIC_PAGES_TAG = "_N_T_/[locale]/layout";

type Section =
  "home" | "news" | "events" | "gallery" | "members" | "impact" | "about" | "support" | "join";

/** What an edit changes → the public sections that show it. */
const AFFECTS = {
  news: ["home", "news", "events"],
  events: ["home", "events", "news", "impact", "about"],
  albums: ["home", "gallery", "events", "news"],
  members: ["members", "about"],
  impact: ["home", "impact", "members", "about"],
  about: ["about"],
  support: ["support"],
  applications: ["join"],
} as const satisfies Record<string, readonly Section[]>;

export type EditedContent = keyof typeof AFFECTS;

const sectionTag = (s: Section) =>
  s === "home" ? "_N_T_/[locale]/page" : `_N_T_/[locale]/${s}/layout`;

/**
 * Marks the public pages that show `content` as stale. Without arguments every public page is
 * marked (site settings, FAQ and enrollment change the header, footer or banner of every page).
 */
export function revalidatePublic(...content: EditedContent[]) {
  if (content.length === 0) {
    revalidateTag(PUBLIC_PAGES_TAG, "max");
    return;
  }
  const sections = new Set(content.flatMap((c) => AFFECTS[c]));
  for (const s of sections) revalidateTag(sectionTag(s), "max");
}

/**
 * For changes an admin checks right away (a member's name shown or hidden): besides marking
 * every public page stale, the given pages are refreshed at once — their data-centre copy is
 * dropped and one request (through the Worker itself) starts the background re-render, so the
 * public page shows the change within seconds instead of on the next visit after that.
 * Runs after the response (`after`), when the stale mark is already stored.
 */
export function refreshPublicPages(content: EditedContent, paths: string[]) {
  revalidatePublic(content);
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
          const res = await env.WORKER_SELF_REFERENCE?.fetch(url, {
            // The background re-render message needs the host (see worker.ts → withHost).
            headers: { host: new URL(url).host },
          });
          await res?.arrayBuffer();
        }
    } catch (err) {
      logger.warn("revalidate", "refresh of public pages failed", err);
    }
  });
}
