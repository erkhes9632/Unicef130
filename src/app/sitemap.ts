import { and, eq, isNotNull, lte } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { albums, events, news } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { getSiteUrl, localizedPath } from "@/lib/seo";

// Built from D1 at request time (content changes without redeploys).
export const dynamic = "force-dynamic";

const staticPaths = [
  "/",
  "/about",
  "/impact",
  "/news",
  "/events",
  "/members",
  "/gallery",
  "/join",
  "/contact",
  "/support",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const entry = (
    path: string,
    lastModified?: Date,
    priority = 0.6,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${localizedPath(routing.defaultLocale, path)}`,
    lastModified,
    priority,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${base}${localizedPath(l, path)}`]),
      ),
    },
  });

  const items: MetadataRoute.Sitemap = staticPaths.map((p) =>
    entry(p, undefined, p === "/" ? 1 : 0.8),
  );
  try {
    const db = await getDb();
    const [newsRows, eventRows, albumRows] = await Promise.all([
      db
        .select({ slug: news.slug, updatedAt: news.updatedAt })
        .from(news)
        .where(
          and(
            eq(news.status, "published"),
            isNotNull(news.publishedAt),
            lte(news.publishedAt, new Date()),
          ),
        ),
      db
        .select({ slug: events.slug, updatedAt: events.updatedAt })
        .from(events)
        .where(eq(events.published, true)),
      db
        .select({ slug: albums.slug, updatedAt: albums.updatedAt })
        .from(albums)
        .where(eq(albums.published, true)),
    ]);
    items.push(
      ...newsRows.map((r) => entry(`/news/${r.slug}`, r.updatedAt, 0.7)),
      ...eventRows.map((r) => entry(`/events/${r.slug}`, r.updatedAt, 0.6)),
      ...albumRows.map((r) => entry(`/gallery/${r.slug}`, r.updatedAt, 0.5)),
    );
  } catch (err) {
    console.error("[sitemap] D1 unavailable, static entries only", err);
  }
  return items;
}
