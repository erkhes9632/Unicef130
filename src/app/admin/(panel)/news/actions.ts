"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";
import { parseUbInputValue } from "@/lib/dates/ub-input";
import { slugify, uniqueSlug } from "@/lib/slug";
import { newsInputSchema } from "@/lib/validation/admin";
import { isEmptyDoc } from "@/lib/validation/rich-text";

function parseForm(data: FormData) {
  const contentEn = fd.json(data, "contentEn");
  return newsInputSchema.safeParse({
    title: fd.str(data, "title"),
    titleEn: fd.str(data, "titleEn"),
    slug: fd.str(data, "slug"),
    excerpt: fd.str(data, "excerpt"),
    excerptEn: fd.str(data, "excerptEn"),
    category: fd.str(data, "category"),
    tags: fd
      .str(data, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    coverUrl: fd.str(data, "coverUrl"),
    content: fd.json(data, "content"),
    contentEn: contentEn && !isEmptyDoc(contentEn as never) ? contentEn : null,
    status: fd.str(data, "status") === "published" ? "published" : "draft",
    publishedAt: parseUbInputValue(fd.str(data, "publishedAt")),
  });
}

export async function saveNews(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  let savedId = id;
  try {
    const user = await requireRole("editor");
    const parsed = parseForm(data);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const db = await getDb();

    const slug = await uniqueSlug(input.slug || slugify(input.title), async (s) => {
      const rows = await db
        .select({ id: news.id })
        .from(news)
        .where(id ? and(eq(news.slug, s), ne(news.id, id)) : eq(news.slug, s))
        .limit(1);
      return rows.length > 0;
    });
    // Publishing without a date → now.
    const publishedAt =
      input.status === "published" ? (input.publishedAt ?? new Date()) : input.publishedAt;
    const values = { ...input, slug, publishedAt };

    if (id) {
      const res = await db
        .update(news)
        .set(values)
        .where(eq(news.id, id))
        .returning({ id: news.id });
      if (!res.length) return { ok: false, message: "Мэдээ олдсонгүй." };
      await logActivity(user, "news.update", {
        type: "news",
        id,
        summary: `«${input.title}» мэдээг засав`,
      });
    } else {
      const [row] = await db
        .insert(news)
        .values({ ...values, authorId: user.id })
        .returning({ id: news.id });
      savedId = row!.id;
      await logActivity(user, "news.create", {
        type: "news",
        id: savedId,
        summary: `«${input.title}» мэдээ нэмэв`,
      });
    }
    revalidatePublic();
  } catch (err) {
    return actionError(err);
  }
  redirect(`/admin/news/${savedId}?saved=1`);
}

export async function deleteNews(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const db = await getDb();
    const [row] = await db.delete(news).where(eq(news.id, id)).returning({ title: news.title });
    if (!row) return { ok: false, message: "Мэдээ олдсонгүй." };
    await logActivity(user, "news.delete", {
      type: "news",
      id,
      summary: `«${row.title}» мэдээг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Мэдээ устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
