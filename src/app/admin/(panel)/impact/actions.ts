"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { impactDirections, impactStats } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";

const yearSchema = z
  .string()
  .trim()
  .regex(/^(\d{4})-(\d{4})$/, { error: "Хичээлийн жилийг 2026-2027 хэлбэрээр бичнэ." })
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, {
    error: "Хоёр дахь он нь эхнийхээсээ 1-ээр их байна (жишээ: 2026-2027).",
  });

const num = (label: string) =>
  z
    .number({ error: `${label}: тоо оруулна уу.` })
    .int({ error: `${label}: бүхэл тоо.` })
    .min(0, { error: `${label}: сөрөг байж болохгүй.` })
    .max(10_000_000_000);

const rowSchema = z.object({
  direction: z.enum(impactDirections),
  activities: num("Үйл ажиллагаа"),
  inPerson: num("Биечлэн"),
  inPersonLabel: z.string().trim().max(20),
  online: num("Онлайн"),
  total: num("Нийт"),
  donationAmount: num("Хандив"),
  notes: z.string().trim().max(2000),
});

const intOf = (data: FormData, key: string) => {
  const v = fd.str(data, key).replace(/[\s,₮+]/g, "");
  return v === "" ? 0 : /^\d+$/.test(v) ? Number(v) : Number.NaN;
};

export async function saveImpactYear(
  schoolYear: string,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const year = yearSchema.safeParse(schoolYear);
    if (!year.success) return validationError(year.error);
    const parsed = z.array(rowSchema).safeParse(
      impactDirections.map((d) => ({
        direction: d,
        activities: intOf(data, `${d}.activities`),
        inPerson: intOf(data, `${d}.inPerson`),
        inPersonLabel: fd.str(data, `${d}.inPersonLabel`),
        online: intOf(data, `${d}.online`),
        total: intOf(data, `${d}.total`),
        donationAmount: intOf(data, `${d}.donationAmount`),
        notes: fd.str(data, `${d}.notes`),
      })),
    );
    if (!parsed.success) return validationError(parsed.error);
    const db = await getDb();
    await db
      .insert(impactStats)
      .values(parsed.data.map((r) => ({ ...r, schoolYear: year.data })))
      .onConflictDoUpdate({
        target: [impactStats.schoolYear, impactStats.direction],
        set: {
          activities: sql`excluded.activities`,
          inPerson: sql`excluded.in_person`,
          inPersonLabel: sql`excluded.in_person_label`,
          online: sql`excluded.online`,
          total: sql`excluded.total`,
          donationAmount: sql`excluded.donation_amount`,
          notes: sql`excluded.notes`,
          updatedAt: new Date(),
        },
      });
    await logActivity(user, "settings.update", {
      type: "impact",
      summary: `${year.data} оны үр дүнг шинэчлэв`,
    });
    revalidatePublic();
    return { ok: true, message: "Хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function createImpactYear(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const year = yearSchema.safeParse(fd.str(data, "schoolYear"));
    if (!year.success) return validationError(year.error);
    const db = await getDb();
    await db
      .insert(impactStats)
      .values(impactDirections.map((direction) => ({ schoolYear: year.data, direction })))
      .onConflictDoNothing();
    await logActivity(user, "settings.update", {
      type: "impact",
      summary: `${year.data} хичээлийн жил нэмэв`,
    });
    revalidatePublic();
    return { ok: true, message: `${year.data} нэмэгдлээ.` };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteImpactYear(schoolYear: string): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const db = await getDb();
    const res = await db
      .delete(impactStats)
      .where(and(eq(impactStats.schoolYear, schoolYear)))
      .returning({ id: impactStats.id });
    if (!res.length) return { ok: false, message: "Олдсонгүй." };
    await logActivity(user, "settings.update", {
      type: "impact",
      summary: `${schoolYear} оны үр дүнг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
