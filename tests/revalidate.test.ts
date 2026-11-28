/**
 * After an admin edit the public page must change within seconds: besides the stale mark,
 * the data-centre copies (worker.ts, two minutes) of the affected sections and of the item's
 * own pages (old and new slug, mn + en) are dropped.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";

const tags: string[] = [];
const deleted: string[] = [];
const pending: (() => Promise<void>)[] = [];
let refreshed = 0;
mock.module("next/cache", () => ({
  revalidateTag: (t: string) => void tags.push(t),
  refresh: () => void (refreshed += 1),
}));
mock.module("next/server", () => ({ after: (fn: () => Promise<void>) => void pending.push(fn) }));
mock.module("@/lib/seo", () => ({ getSiteUrl: async () => "https://site.test" }));
mock.module("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: {} }) }));
(globalThis as unknown as { caches: unknown }).caches = {
  default: { delete: async (r: Request) => void deleted.push(new URL(r.url).pathname) },
};
const { revalidatePublic, revalidatePublicItem } = await import("@/lib/admin/revalidate");

const run = async () => {
  for (const fn of pending.splice(0)) await fn();
};

beforeEach(() => {
  tags.length = 0;
  deleted.length = 0;
  pending.length = 0;
  refreshed = 0;
});

describe("revalidatePublic", () => {
  test("news edit: stale marks + copies of the sections and both slugs, mn + en", async () => {
    revalidatePublicItem("news", ["/news/new-slug", "/news/old-slug", null]);
    await run();
    expect(tags).toEqual([
      "_N_T_/[locale]/page",
      "_N_T_/[locale]/news/layout",
      "_N_T_/[locale]/events/layout",
    ]);
    expect(deleted.sort()).toEqual(
      [
        "/",
        "/en",
        "/news",
        "/en/news",
        "/events",
        "/en/events",
        "/news/new-slug",
        "/en/news/new-slug",
        "/news/old-slug",
        "/en/news/old-slug",
      ].sort(),
    );
    // The admin page that made the edit is refreshed in the same round trip.
    expect(refreshed).toBe(1);
  });

  test("site-wide change (settings, FAQ, enrollment): one tag, every section's copy", async () => {
    revalidatePublic();
    await run();
    expect(tags).toEqual(["_N_T_/[locale]/layout"]);
    expect(deleted).toContain("/");
    expect(deleted).toContain("/en/members");
    expect(deleted).toContain("/support");
  });
});
