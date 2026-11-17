import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { albums, images } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import type { GalleryImage } from "@/lib/types";
import { pick } from "./localize";

export type AlbumItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  /** The activity the photos are from. */
  eventId: string | null;
  coverUrl: string | null;
  imageCount: number;
  images: GalleryImage[];
};

type AlbumRow = typeof albums.$inferSelect;
type ImageRow = typeof images.$inferSelect;

function toImage(r: ImageRow): GalleryImage {
  return {
    id: r.id,
    url: r.url,
    thumbUrl: r.thumbUrl,
    width: r.width,
    height: r.height,
    alt: r.alt,
    order: r.sortOrder,
  };
}

function toItem(locale: Locale, a: AlbumRow, imgs: ImageRow[]): AlbumItem {
  const title = pick(locale, a.title, a.titleEn);
  // Image alt texts are entered in Mongolian; in English use the album title instead.
  const list = imgs.map((r, i) => {
    const img = toImage(r);
    return locale === "en" ? { ...img, alt: `${title} — ${i + 1}` } : img;
  });
  return {
    id: a.id,
    slug: a.slug,
    title,
    description: pick(locale, a.description, a.descriptionEn),
    date: a.date,
    eventId: a.eventId,
    coverUrl: a.coverUrl ?? list[0]?.thumbUrl ?? null,
    imageCount: list.length,
    images: list,
  };
}

async function imagesFor(albumIds: string[]) {
  if (!albumIds.length) return new Map<string, ImageRow[]>();
  const db = await getDb();
  const rows = await db
    .select()
    .from(images)
    .where(inArray(images.albumId, albumIds))
    .orderBy(asc(images.sortOrder));
  const map = new Map<string, ImageRow[]>();
  for (const r of rows) map.set(r.albumId, [...(map.get(r.albumId) ?? []), r]);
  return map;
}

export async function listAlbums(locale: Locale) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(albums)
    .where(eq(albums.published, true))
    .orderBy(desc(albums.date));
  const imgs = await imagesFor(rows.map((r) => r.id));
  return rows.map((a) => toItem(locale, a, imgs.get(a.id) ?? []));
}

export async function getAlbumBySlug(locale: Locale, slug: string) {
  const db = await getDb();
  const [a] = await db.select().from(albums).where(eq(albums.slug, slug)).limit(1);
  if (!a || !a.published) return null;
  const imgs = await imagesFor([a.id]);
  return toItem(locale, a, imgs.get(a.id) ?? []);
}

/** A few recent images across albums for the homepage preview. */
export async function getGalleryPreview(locale: Locale, limit = 6) {
  const albumsList = await listAlbums(locale);
  return albumsList
    .flatMap((a) =>
      a.images.slice(0, 3).map((img) => ({ ...img, albumSlug: a.slug, albumTitle: a.title })),
    )
    .slice(0, limit);
}

/** A published album by id (photos under a news post, the album of an activity). */
export async function getAlbumById(locale: Locale, id: string) {
  const db = await getDb();
  const [a] = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
  if (!a || !a.published) return null;
  const imgs = await imagesFor([a.id]);
  return toItem(locale, a, imgs.get(a.id) ?? []);
}

/** The published album of an activity (newest when there are several). */
export async function getAlbumForEvent(locale: Locale, eventId: string) {
  const db = await getDb();
  const [a] = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.eventId, eventId), eq(albums.published, true)))
    .orderBy(desc(albums.date))
    .limit(1);
  return a ? getAlbumById(locale, a.id) : null;
}

/** Admin selects: every album (drafts too), newest first. */
export async function listAlbumOptions() {
  const db = await getDb();
  return db.select({ id: albums.id, title: albums.title }).from(albums).orderBy(desc(albums.date));
}
