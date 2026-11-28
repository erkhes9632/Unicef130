import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { refresh, revalidateTag } from "next/cache";
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

const SECTION_PATH: Record<Section, string> = {
  home: "/",
  news: "/news",
  events: "/events",
  gallery: "/gallery",
  members: "/members",
  impact: "/impact",
  about: "/about",
  support: "/support",
  join: "/join",
};
const ALL_SECTIONS = Object.keys(SECTION_PATH) as Section[];

/** A public path in both languages (mn without a prefix, en under /en). */
export function bothLocales(path: string): string[] {
  return [path, `/en${path === "/" ? "" : path}`];
}

/**
 * Marks the public pages that show `content` as stale. Without arguments every public page is
 * marked (site settings, FAQ and enrollment change the header, footer or banner of every page).
 * The data-centre copies of those sections (worker.ts, EDGE_TTL) are dropped too, so the next
 * visit reads the OpenNext cache and starts the re-render: the change shows within seconds
 * instead of after the copy's two minutes. `detailPaths`: item pages to drop as well
 * (e.g. `/news/<old slug>` and `/news/<new slug>`).
 */
export function revalidatePublic(...content: EditedContent[]) {
  revalidateSections(content, []);
}

/** `revalidatePublic(content)` plus the item's own pages (both languages). */
export function revalidatePublicItem(content: EditedContent, detailPaths: (string | null)[]) {
  revalidateSections(
    [content],
    detailPaths.filter((p): p is string => !!p),
  );
}

function revalidateSections(content: EditedContent[], detailPaths: string[]) {
  const sections = content.length ? [...new Set(content.flatMap((c) => AFFECTS[c]))] : ALL_SECTIONS;
  if (content.length === 0) revalidateTag(PUBLIC_PAGES_TAG, "max");
  else for (const s of sections) revalidateTag(sectionTag(s), "max");
  dropEdgeCopies([...sections.map((s) => SECTION_PATH[s]), ...new Set(detailPaths)]);
  // "max" is stale-while-revalidate and no longer refreshes the admin page that called the
  // action (Next 16): without this, a deleted row or a moved photo stayed on screen.
  try {
    refresh();
  } catch {
    // Not inside a Server Action (tests, scripts).
  }
}

/** Deletes the data-centre copies of `paths` (mn + en) after the response. Never fatal. */
function dropEdgeCopies(paths: string[]) {
  try {
    after(async () => {
      try {
        const origin = await getSiteUrl();
        const cache = (caches as unknown as { default: Cache }).default;
        await Promise.all(
          paths.flatMap(bothLocales).map((p) => cache.delete(new Request(`${origin}${p}`))),
        );
      } catch (err) {
        logger.warn("revalidate", "dropping data-centre copies failed", err);
      }
    });
  } catch {
    // Outside a request (scripts, tests): there is no data-centre copy to drop.
  }
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
        for (const url of bothLocales(path).map((p) => `${origin}${p}`)) {
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
