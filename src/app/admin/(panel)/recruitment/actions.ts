"use server";

import { eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { recruitmentPeriods } from "@/db/schema";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { diffFields, logActivity } from "@/lib/admin/activity";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { assertAdmin } from "@/lib/auth/session";
import { parseUbInputValue } from "@/lib/dates/ub-input";
import { parseClassList, periodsOverlap } from "@/lib/recruitment/logic";
import { periodInputSchema } from "@/lib/validation/recruitment";

const optInt = (v: string) => (v === "" ? null : /^\d+$/.test(v) ? Number(v) : Number.NaN);

export async function savePeriod(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const questions = fd.json(data, "questions");
    const parsed = periodInputSchema.safeParse({
      name: fd.str(data, "name"),
      nameEn: fd.str(data, "nameEn"),
      schoolYear: fd.str(data, "schoolYear"),
      opensAt: parseUbInputValue(fd.str(data, "opensAt")) ?? undefined,
      closesAt: parseUbInputValue(fd.str(data, "closesAt")) ?? undefined,
      capacity: optInt(fd.str(data, "capacity")),
      whenFull: fd.str(data, "whenFull") === "close" ? "close" : "waitlist",
      classes: parseClassList(fd.str(data, "classes")),
      introText: fd.str(data, "introText"),
      introTextEn: fd.str(data, "introTextEn"),
      closedMessage: fd.str(data, "closedMessage"),
      closedMessageEn: fd.str(data, "closedMessageEn"),
      questions: questions === null ? [] : questions,
      showBanner: fd.bool(data, "showBanner"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    const db = await getDb();
    // Only one period may be open at a time: windows must not overlap.
    const others = await db
      .select({
        name: recruitmentPeriods.name,
        opensAt: recruitmentPeriods.opensAt,
        closesAt: recruitmentPeriods.closesAt,
      })
      .from(recruitmentPeriods)
      .where(id ? ne(recruitmentPeriods.id, id) : undefined);
    const clash = others.find((o) => periodsOverlap(o, input));
    if (clash) {
      return {
        ok: false,
        message: `Энэ хугацаа «${clash.name}» элсэлттэй давхцаж байна. Нэг үед зөвхөн нэг элсэлт нээлттэй байж болно.`,
      };
    }

    if (id) {
      const [before] = await db
        .select()
        .from(recruitmentPeriods)
        .where(eq(recruitmentPeriods.id, id))
        .limit(1);
      if (!before) return { ok: false, message: "Элсэлт олдсонгүй." };
      await db.update(recruitmentPeriods).set(input).where(eq(recruitmentPeriods.id, id));
      await logActivity(user, "recruitment.update", {
        type: "recruitment",
        id,
        summary: `«${input.name}» элсэлтийг засав`,
        changes: diffFields(before, input, [
          "name",
          "schoolYear",
          "opensAt",
          "closesAt",
          "capacity",
          "whenFull",
          "classes",
          "questions",
          "showBanner",
        ]),
      });
    } else {
      const [row] = await db
        .insert(recruitmentPeriods)
        .values(input)
        .returning({ id: recruitmentPeriods.id });
      await logActivity(user, "recruitment.create", {
        type: "recruitment",
        id: row!.id,
        summary: `«${input.name}» элсэлт үүсгэв`,
      });
    }
    revalidatePublic();
  } catch (err) {
    return actionError(err);
  }
  redirect("/admin/recruitment?saved=1");
}

/** Applications of a deleted period are kept (they just lose the link to it). */
export async function deletePeriod(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const db = await getDb();
    const [row] = await db
      .delete(recruitmentPeriods)
      .where(eq(recruitmentPeriods.id, id))
      .returning({ name: recruitmentPeriods.name });
    if (!row) return { ok: false, message: "Элсэлт олдсонгүй." };
    await logActivity(user, "recruitment.delete", {
      type: "recruitment",
      summary: `«${row.name}» элсэлтийг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Элсэлт устгагдлаа. Өргөдлүүд хэвээр үлдсэн." };
  } catch (err) {
    return actionError(err);
  }
}
