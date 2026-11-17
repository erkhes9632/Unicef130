"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { faqs } from "@/db/schema";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { logActivity, shortId } from "@/lib/admin/activity";
import { assertAdmin } from "@/lib/auth/session";

const faqSchema = z.object({
  question: z.string().trim().min(3, { error: "Асуулт хэт богино." }).max(200),
  questionEn: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  answer: z.string().trim().min(3, { error: "Хариулт хэт богино." }).max(3000),
  answerEn: z
    .string()
    .trim()
    .max(3000)
    .transform((v) => v || null),
  published: z.boolean(),
});

function revalidateFaq() {
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  revalidatePath("/en/faq");
}

/** Creates (id = null) or updates a question. */
export async function saveFaq(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const parsed = faqSchema.safeParse({
      question: fd.str(data, "question"),
      questionEn: fd.str(data, "questionEn"),
      answer: fd.str(data, "answer"),
      answerEn: fd.str(data, "answerEn"),
      published: fd.bool(data, "published"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const db = await getDb();
    if (id) {
      const res = await db
        .update(faqs)
        .set(parsed.data)
        .where(eq(faqs.id, id))
        .returning({ id: faqs.id });
      if (!res.length) return { ok: false, message: "Асуулт олдсонгүй." };
    } else {
      const all = await db.select({ sortOrder: faqs.sortOrder }).from(faqs);
      const next = all.reduce((m, r) => Math.max(m, r.sortOrder), 0) + 10;
      const [row] = await db
        .insert(faqs)
        .values({ ...parsed.data, sortOrder: next })
        .returning({ id: faqs.id });
      id = row!.id;
    }
    await logActivity(user, "faq.save", {
      type: "faq",
      id,
      summary: `«${parsed.data.question}» асуултыг хадгалав`,
    });
    revalidateFaq();
    return { ok: true, message: "Хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteFaq(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const [row] = await (
      await getDb()
    )
      .delete(faqs)
      .where(eq(faqs.id, id))
      .returning({ question: faqs.question });
    if (!row) return { ok: false, message: "Асуулт олдсонгүй." };
    await logActivity(user, "faq.delete", {
      type: "faq",
      id,
      summary: `Асуулт #${shortId(id)} устгав`,
    });
    revalidateFaq();
    return { ok: true, message: "Устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** Moves a question one place up or down (renumbers all to keep the order stable). */
export async function moveFaq(id: string, direction: "up" | "down"): Promise<ActionState> {
  try {
    await assertAdmin();
    const db = await getDb();
    const rows = await db
      .select({ id: faqs.id })
      .from(faqs)
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
    const i = rows.findIndex((r) => r.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return { ok: false, message: "Зөөх боломжгүй." };
    [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    for (const [n, r] of rows.entries())
      await db
        .update(faqs)
        .set({ sortOrder: (n + 1) * 10 })
        .where(eq(faqs.id, r.id));
    revalidateFaq();
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
