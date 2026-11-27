import { asc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumForm } from "@/components/admin/album-form";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { albums, images } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listEventOptions } from "@/lib/data/event-options";
import {
  addAlbumImages,
  deleteAlbumImage,
  moveAlbumImage,
  saveAlbum,
  setAlbumCover,
  updateImageAlt,
} from "../actions";

export const metadata: Metadata = { title: "Цомог засах" };

export default async function EditAlbumPage({ params }: PageProps<"/admin/gallery/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const [album] = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
  if (!album) notFound();
  const imgs = await db
    .select({
      id: images.id,
      url: images.url,
      thumbUrl: images.thumbUrl,
      alt: images.alt,
      altEn: images.altEn,
    })
    .from(images)
    .where(eq(images.albumId, id))
    .orderBy(asc(images.sortOrder));

  return (
    <>
      <AdminPageHeader
        title="Цомог засах"
        description={album.title}
        actions={
          album.published && (
            <Button asChild variant="outline">
              <Link href={`/gallery/${album.slug}`} target="_blank">
                <ExternalLink /> Сайт дээр харах
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-6 2xl:grid-cols-[28rem_1fr]">
        <AlbumForm
          key={album.updatedAt.getTime()}
          action={saveAlbum.bind(null, album.id)}
          initial={album}
          events={await listEventOptions()}
        />
        <GalleryManager
          albumTitle={album.title}
          images={imgs}
          coverUrl={album.coverUrl}
          addImages={addAlbumImages.bind(null, album.id)}
          deleteImage={deleteAlbumImage}
          moveImage={moveAlbumImage}
          updateAlt={updateImageAlt}
          setCover={setAlbumCover.bind(null, album.id)}
        />
      </div>
    </>
  );
}
