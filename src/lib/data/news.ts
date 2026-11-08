import type { Locale } from "@/i18n/routing";
import { mockNews } from "@/lib/mock/news";
import type { NewsCategory, NewsPost, RichTextDoc } from "@/lib/types";
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
};

export const NEWS_PAGE_SIZE = 6;

function toItem(locale: Locale, post: NewsPost): NewsItem {
  return {
    id: post.id,
    slug: post.slug,
    title: pick(locale, post.title, post.titleEn),
    excerpt: pick(locale, post.excerpt, post.excerptEn),
    content: pick(locale, post.content, post.contentEn),
    coverUrl: post.coverUrl,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt ?? new Date(0).toISOString(),
  };
}

// Phase 5: replace with D1 queries (Drizzle). Keep the signatures.
async function publishedPosts(): Promise<NewsPost[]> {
  return mockNews
    .filter((p) => p.status === "published" && p.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
}

export async function listNews({
  locale,
  page = 1,
  pageSize = NEWS_PAGE_SIZE,
  category,
}: {
  locale: Locale;
  page?: number;
  pageSize?: number;
  category?: NewsCategory;
}) {
  const all = (await publishedPosts()).filter((p) => !category || p.category === category);
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const items = all
    .slice((current - 1) * pageSize, current * pageSize)
    .map((p) => toItem(locale, p));
  return { items, total: all.length, page: current, pageCount };
}

export async function getLatestNews(locale: Locale, limit = 3) {
  return (await publishedPosts()).slice(0, limit).map((p) => toItem(locale, p));
}

export async function getNewsBySlug(locale: Locale, slug: string) {
  const post = (await publishedPosts()).find((p) => p.slug === slug);
  return post ? toItem(locale, post) : null;
}

export async function getRelatedNews(locale: Locale, item: NewsItem, limit = 3) {
  const posts = (await publishedPosts()).filter((p) => p.id !== item.id);
  const sameCategory = posts.filter((p) => p.category === item.category);
  const rest = posts.filter((p) => p.category !== item.category);
  return [...sameCategory, ...rest].slice(0, limit).map((p) => toItem(locale, p));
}

export async function searchNews(locale: Locale, query: string, limit = 20) {
  const q = query.toLocaleLowerCase();
  return (await publishedPosts())
    .map((p) => toItem(locale, p))
    .filter((p) =>
      [p.title, p.excerpt, ...p.tags].some((field) => field.toLocaleLowerCase().includes(q)),
    )
    .slice(0, limit);
}
