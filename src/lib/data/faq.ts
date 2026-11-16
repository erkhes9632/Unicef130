import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { faqs } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { pick } from "./localize";

/** Published questions in the admin's order (English falls back to Mongolian). */
export async function listFaqs(locale: Locale) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(faqs)
    .where(eq(faqs.published, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return rows.map((f) => ({
    id: f.id,
    question: pick(locale, f.question, f.questionEn),
    answer: pick(locale, f.answer, f.answerEn),
  }));
}
