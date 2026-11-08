import type { Locale } from "@/i18n/routing";
import { mockAlbums } from "@/lib/mock/gallery";
import type { Album, GalleryImage } from "@/lib/types";
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

function toItem(locale: Locale, a: Album): AlbumItem {
  const images = [...a.images].sort((x, y) => x.order - y.order);
  return {
    id: a.id,
    slug: a.slug,
    title: pick(locale, a.title, a.titleEn),
    description: pick(locale, a.description, a.descriptionEn),
    date: a.date,
    coverUrl: a.coverUrl ?? images[0]?.thumbUrl ?? null,
    imageCount: images.length,
    images,
  };
}

// Phase 5/7: replace with D1 queries (Drizzle). Keep the signatures.
async function publishedAlbums() {
  return mockAlbums.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date));
}

export async function listAlbums(locale: Locale) {
  return (await publishedAlbums()).map((a) => toItem(locale, a));
}

export async function getAlbumBySlug(locale: Locale, slug: string) {
  const a = (await publishedAlbums()).find((al) => al.slug === slug);
  return a ? toItem(locale, a) : null;
}

/** A few recent images across albums for the homepage preview. */
export async function getGalleryPreview(locale: Locale, limit = 6) {
  const albums = await listAlbums(locale);
  return albums
    .flatMap((a) =>
      a.images.slice(0, 3).map((img) => ({ ...img, albumSlug: a.slug, albumTitle: a.title })),
    )
    .slice(0, limit);
}
