"use server";

import { getDb } from "@/db";
import { actionError, validationError, type ActionState } from "@/lib/admin/action-state";
import { refreshPublicPages } from "@/lib/admin/revalidate";
import { assertAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { latestTeamYear, startSchoolYear, wizardYears } from "@/lib/members/years";
import { displayYear } from "@/lib/school-year";
import { startYearSchema } from "@/lib/validation/admin";

export type StartYearResult = ActionState & {
  summary?: { year: string; leaders: number; members: number; created: number };
};

/**
 * «Шинэ хичээлийн жил эхлүүлэх» (wizard, last step). The new year is decided here again (the
 * browser's value must match), so a stale wizard can't create the wrong year. Nothing is
 * deleted: earlier years stay as history.
 */
export async function startNewSchoolYear(input: unknown): Promise<StartYearResult> {
  try {
    const user = await assertAdmin();
    const parsed = startYearSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;
    if (data.leaders.some((l) => l.showPublicly) && !data.consent)
      return {
        ok: false,
        message:
          "Нэрийг нийтлэхийн өмнө эцэг эх / асран хамгаалагч зөвшөөрснийг баталгаажуулна уу.",
      };
    const db = await getDb();
    const current = await getCurrentSchoolYear();
    const { to } = wizardYears(await latestTeamYear(db), current);
    if (to !== data.year)
      return {
        ok: false,
        message: `Энэ хооронд ${displayYear(data.year)} оны баг үүссэн байна. Хуудсыг дахин ачаална уу.`,
      };
    const res = await startSchoolYear(db, user, { ...data, current });
    refreshPublicPages("members", ["/members", "/about"]);
    return {
      ok: true,
      message: `${displayYear(data.year)} хичээлийн жил эхэллээ.`,
      summary: { year: data.year, ...res },
    };
  } catch (err) {
    return actionError(err);
  }
}
