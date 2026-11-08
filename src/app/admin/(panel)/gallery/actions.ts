"use server";

import { and, asc, eq, gt, lt, max, ne, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { albums, images } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";
import { deleteMediaUrls, isOwnMediaUrl } from "@/lib/media/server";
import { slugify, uniqueSlug } from "@/lib/slug";
import { albumImagesSchema, albumInputSchema } from "@/lib/validation/admin";

export async function saveAlbum(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  let savedId = id;
  try {
    const user = await requireRole("editor");
    const parsed = albumInputSchema.safeParse({
      title: fd.str(data, "title"),
      titleEn: fd.str(data, "titleEn"),
      slug: fd.str(data, "slug"),
      description: fd.str(data, "description"),
      descriptionEn: fd.str(data, "descriptionEn"),
      date: fd.str(data, "date"),
      published: fd.bool(data, "published"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const db = await getDb();
    const slug = await uniqueSlug(input.slug || slugify(input.title), async (s) => {
      const rows = await db
        .select({ id: albums.id })
        .from(albums)
        .where(id ? and(eq(albums.slug, s), ne(albums.id, id)) : eq(albums.slug, s))
        .limit(1);
      return rows.length > 0;
    });
    if (id) {
      const res = await db
        .update(albums)
        .set({ ...input, slug })
        .where(eq(albums.id, id))
        .returning({ id: albums.id });
      if (!res.length) return { ok: false, message: "Цомог олдсонгүй." };
      await logActivity(user, "album.update", {
        type: "album",
        id,
        summary: `«${input.title}» цомгийг засав`,
      });
    } else {
      const [row] = await db
        .insert(albums)
        .values({ ...input, slug })
        .returning({ id: albums.id });
      savedId = row!.id;
      await logActivity(user, "album.create", {
        type: "album",
        id: savedId,
        summary: `«${input.title}» цомог нэмэв`,
      });
    }
    revalidatePublic();
  } catch (err) {
    return actionError(err);
  }
  redirect(`/admin/gallery/${savedId}?saved=1`);
}

export async function deleteAlbum(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const db = await getDb();
    const imgs = await db
      .select({ url: images.url, thumbUrl: images.thumbUrl })
      .from(images)
      .where(eq(images.albumId, id));
    const [row] = await db
      .delete(albums)
      .where(eq(albums.id, id))
      .returning({ title: albums.title, coverUrl: albums.coverUrl });
    if (!row) return { ok: false, message: "Цомог олдсонгүй." };
    await deleteMediaUrls([row.coverUrl, ...imgs.flatMap((i) => [i.url, i.thumbUrl])]);
    await logActivity(user, "album.delete", {
      type: "album",
      id,
      summary: `«${row.title}» цомгийг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Цомог устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** Registers images that the browser already uploaded to R2 (via /api/admin/upload). */
export async function addAlbumImages(albumId: string, input: unknown): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const parsed = albumImagesSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    if (
      !parsed.data.every(
        (i) => isOwnMediaUrl(i.url, "gallery") && isOwnMediaUrl(i.thumbUrl, "gallery"),
      )
    ) {
      return { ok: false, message: "Зургийн хаяг буруу." };
    }
    const db = await getDb();
    const [album] = await db
      .select({ id: albums.id, title: albums.title })
      .from(albums)
      .where(eq(albums.id, albumId))
      .limit(1);
    if (!album) return { ok: false, message: "Цомог олдсонгүй." };
    const [{ top } = { top: null }] = await db
      .select({ top: max(images.sortOrder) })
      .from(images)
      .where(eq(images.albumId, albumId));
    let order = (top ?? -1) + 1;
    await db.insert(images).values(parsed.data.map((i) => ({ ...i, albumId, sortOrder: order++ })));
    await logActivity(user, "album.images", {
      type: "album",
      id: albumId,
      summary: `«${album.title}» цомогт ${parsed.data.length} зураг нэмэв`,
    });
    revalidatePublic();
    return { ok: true, message: `${parsed.data.length} зураг нэмэгдлээ.` };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteAlbumImage(imageId: string): Promise<ActionState> {
  try {
    await requireRole("editor");
    const db = await getDb();
    const [img] = await db.delete(images).where(eq(images.id, imageId)).returning();
    if (!img) return { ok: false, message: "Зураг олдсонгүй." };
    // Clear the album cover if it pointed at this image.
    await db
      .update(albums)
      .set({ coverUrl: null })
      .where(and(eq(albums.id, img.albumId), eq(albums.coverUrl, img.thumbUrl)));
    await deleteMediaUrls([img.url, img.thumbUrl]);
    revalidatePublic();
    return { ok: true, message: "Зураг устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function moveAlbumImage(
  imageId: string,
  direction: "up" | "down",
): Promise<ActionState> {
  try {
    await requireRole("editor");
    const db = await getDb();
    const [img] = await db.select().from(images).where(eq(images.id, imageId)).limit(1);
    if (!img) return { ok: false, message: "Зураг олдсонгүй." };
    const [neighbor] = await db
      .select()
      .from(images)
      .where(
        and(
          eq(images.albumId, img.albumId),
          direction === "up"
            ? lt(images.sortOrder, img.sortOrder)
            : gt(images.sortOrder, img.sortOrder),
        ),
      )
      .orderBy(direction === "up" ? desc(images.sortOrder) : asc(images.sortOrder))
      .limit(1);
    if (!neighbor) return { ok: true };
    await db.batch([
      db.update(images).set({ sortOrder: neighbor.sortOrder }).where(eq(images.id, img.id)),
      db.update(images).set({ sortOrder: img.sortOrder }).where(eq(images.id, neighbor.id)),
    ]);
    revalidatePublic();
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

export async function updateImageAlt(imageId: string, alt: string): Promise<ActionState> {
  try {
    await requireRole("editor");
    const db = await getDb();
    await db
      .update(images)
      .set({ alt: String(alt).trim().slice(0, 200) })
      .where(eq(images.id, imageId));
    revalidatePublic();
    return { ok: true, message: "Тайлбар хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function setAlbumCover(albumId: string, imageId: string): Promise<ActionState> {
  try {
    await requireRole("editor");
    const db = await getDb();
    const [img] = await db
      .select({ thumbUrl: images.thumbUrl })
      .from(images)
      .where(and(eq(images.id, imageId), eq(images.albumId, albumId)))
      .limit(1);
    if (!img) return { ok: false, message: "Зураг олдсонгүй." };
    await db.update(albums).set({ coverUrl: img.thumbUrl }).where(eq(albums.id, albumId));
    revalidatePublic();
    return { ok: true, message: "Нүүр зураг солигдлоо." };
  } catch (err) {
    return actionError(err);
  }
}
