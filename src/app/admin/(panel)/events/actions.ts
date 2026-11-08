"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";
import { deleteMediaUrls } from "@/lib/media/server";
import { parseUbInputValue } from "@/lib/dates/ub-input";
import { slugify, uniqueSlug } from "@/lib/slug";
import { eventInputSchema } from "@/lib/validation/admin";
import { isEmptyDoc } from "@/lib/validation/rich-text";

function parseForm(data: FormData) {
  const contentEn = fd.json(data, "contentEn");
  return eventInputSchema.safeParse({
    title: fd.str(data, "title"),
    titleEn: fd.str(data, "titleEn"),
    slug: fd.str(data, "slug"),
    summary: fd.str(data, "summary"),
    summaryEn: fd.str(data, "summaryEn"),
    location: fd.str(data, "location"),
    locationEn: fd.str(data, "locationEn"),
    coverUrl: fd.str(data, "coverUrl"),
    startsAt: parseUbInputValue(fd.str(data, "startsAt")) ?? undefined,
    endsAt: parseUbInputValue(fd.str(data, "endsAt")),
    content: fd.json(data, "content"),
    contentEn: contentEn && !isEmptyDoc(contentEn as never) ? contentEn : null,
    published: fd.bool(data, "published"),
  });
}

export async function saveEvent(
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
        .select({ id: events.id })
        .from(events)
        .where(id ? and(eq(events.slug, s), ne(events.id, id)) : eq(events.slug, s))
        .limit(1);
      return rows.length > 0;
    });
    const values = { ...input, slug };

    if (id) {
      const [prev] = await db
        .select({ coverUrl: events.coverUrl })
        .from(events)
        .where(eq(events.id, id))
        .limit(1);
      const res = await db
        .update(events)
        .set(values)
        .where(eq(events.id, id))
        .returning({ id: events.id });
      if (!res.length) return { ok: false, message: "Арга хэмжээ олдсонгүй." };
      if (prev?.coverUrl && prev.coverUrl !== input.coverUrl)
        await deleteMediaUrls([prev.coverUrl]);
      await logActivity(user, "event.update", {
        type: "event",
        id,
        summary: `«${input.title}» арга хэмжээг засав`,
      });
    } else {
      const [row] = await db.insert(events).values(values).returning({ id: events.id });
      savedId = row!.id;
      await logActivity(user, "event.create", {
        type: "event",
        id: savedId,
        summary: `«${input.title}» арга хэмжээ нэмэв`,
      });
    }
    revalidatePublic();
  } catch (err) {
    return actionError(err);
  }
  redirect(`/admin/events/${savedId}?saved=1`);
}

export async function deleteEvent(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const db = await getDb();
    const [row] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning({ title: events.title, coverUrl: events.coverUrl });
    if (!row) return { ok: false, message: "Арга хэмжээ олдсонгүй." };
    await deleteMediaUrls([row.coverUrl]);
    await logActivity(user, "event.delete", {
      type: "event",
      id,
      summary: `«${row.title}» арга хэмжээг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Арга хэмжээ устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
