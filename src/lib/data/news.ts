import { and, count, desc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { normalizeSdgs } from "@/lib/sdg";
import { newsCategories, type NewsCategory, type RichTextDoc } from "@/lib/types";
import { pick } from "./localize";

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: RichTextDoc;
  coverUrl: string | null;
  category: NewsCategory;
  tags: string[];
  publishedAt: string;
  sdgs: number[];
  eventId: string | null;
};

export const NEWS_PAGE_SIZE = 6;

type Row = typeof news.$inferSelect;

function toItem(locale: Locale, r: Row): NewsItem {
  return {
    id: r.id,
    slug: r.slug,
    title: pick(locale, r.title, r.titleEn),
    excerpt: pick(locale, r.excerpt, r.excerptEn),
    content: pick(locale, r.content, r.contentEn),
    coverUrl: r.coverUrl,
    category: (newsCategories as readonly string[]).includes(r.category)
      ? (r.category as NewsCategory)
      : "activity",
    tags: r.tags ?? [],
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    sdgs: normalizeSdgs(r.sdgs),
    eventId: r.eventId,
  };
}

/** Published and not scheduled in the future. */
const visible = () =>
  and(eq(news.status, "published"), isNotNull(news.publishedAt), lte(news.publishedAt, new Date()));

export async function listNews({
  locale,
  page = 1,
  pageSize = NEWS_PAGE_SIZE,
  category,
  sdg,
}: {
  locale: Locale;
  page?: number;
  pageSize?: number;
  category?: NewsCategory;
  /** Only posts tagged with this SDG (1–17). */
  sdg?: number;
}) {
  const db = await getDb();
  const where = and(
    visible(),
    category ? eq(news.category, category) : undefined,
    sdg ? sql`exists (select 1 from json_each(${news.sdgs}) where value = ${sdg})` : undefined,
  );
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(news).where(where);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = await db
    .select()
    .from(news)
    .where(where)
    .orderBy(desc(news.publishedAt))
    .limit(pageSize)
    .offset((current - 1) * pageSize);
  return { items: rows.map((r) => toItem(locale, r)), total, page: current, pageCount };
}

export async function getLatestNews(locale: Locale, limit = 3) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(news)
    .where(visible())
    .orderBy(desc(news.publishedAt))
    .limit(limit);
  return rows.map((r) => toItem(locale, r));
}

export async function getNewsBySlug(locale: Locale, slug: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(news)
    .where(and(visible(), eq(news.slug, slug)))
    .limit(1);
  return row ? toItem(locale, row) : null;
}

export async function getRelatedNews(locale: Locale, item: NewsItem, limit = 3) {
  const db = await getDb();
  const same = await db
    .select()
    .from(news)
    .where(and(visible(), eq(news.category, item.category), ne(news.id, item.id)))
    .orderBy(desc(news.publishedAt))
    .limit(limit);
  if (same.length >= limit) return same.map((r) => toItem(locale, r));
  const rest = await db
    .select()
    .from(news)
    .where(and(visible(), ne(news.category, item.category), ne(news.id, item.id)))
    .orderBy(desc(news.publishedAt))
    .limit(limit - same.length);
  return [...same, ...rest].map((r) => toItem(locale, r));
}

/**
 * Case-insensitive search. SQLite's LIKE/lower() only fold ASCII, so Cyrillic matching is done
 * in JS over the most recent posts (a club site has at most a few hundred).
 */
export async function searchNews(locale: Locale, query: string, limit = 20) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(news)
    .where(visible())
    .orderBy(desc(news.publishedAt))
    .limit(500);
  const q = query.toLocaleLowerCase();
  return rows
    .map((r) => ({ item: toItem(locale, r), r }))
    .filter(({ r }) =>
      [r.title, r.titleEn ?? "", r.excerpt, r.excerptEn ?? "", ...(r.tags ?? [])].some((f) =>
        f.toLocaleLowerCase().includes(q),
      ),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

/** Slugs of the published posts that report on the given events (eventId → slug). */
export async function getNewsSlugsForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, string>();
  const db = await getDb();
  const rows = await db
    .select({ eventId: news.eventId, slug: news.slug })
    .from(news)
    .where(and(visible(), inArray(news.eventId, eventIds)));
  return new Map(rows.filter((r) => r.eventId).map((r) => [r.eventId!, r.slug]));
}
