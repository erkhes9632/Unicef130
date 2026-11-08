import { asc, desc, eq, inArray } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { getDb } from "@/db";
import { albums, images } from "@/db/schema";
import type { GalleryImage } from "@/lib/types";
import { pick } from "./localize";

export type AlbumItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
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
  const list = imgs.map(toImage);
  return {
    id: a.id,
    slug: a.slug,
    title: pick(locale, a.title, a.titleEn),
    description: pick(locale, a.description, a.descriptionEn),
    date: a.date,
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
