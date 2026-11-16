"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { volunteerHours } from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { actionError, fd, type ActionState } from "@/lib/admin/action-state";
import { assertAdmin } from "@/lib/auth/session";
import { parseUbInputValue } from "@/lib/dates/ub-input";
import { addHoursEntries } from "@/lib/members/hours";
import { parseHours } from "@/lib/members/logic";

const entrySchema = z.object({
  memberIds: z.array(z.string().min(1).max(64)).min(1).max(500),
  hours: z.number(),
  date: z.date(),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  note: z.string().trim().max(200),
  eventId: z.string().max(64).nullable(),
});

/** Adds the same hours to every selected member (manual entry or a whole team at once). */
export async function addHours(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const hours = parseHours(fd.str(data, "hours"));
    if (hours === null) return { ok: false, message: "Цагийг 0.25–24 хооронд оруулна уу." };
    const date = parseUbInputValue(`${fd.str(data, "date")}T12:00`);
    const parsed = entrySchema.safeParse({
      memberIds: data.getAll("memberIds"),
      hours,
      date: date ?? undefined,
      schoolYear: fd.str(data, "schoolYear"),
      note: fd.str(data, "note"),
      eventId: fd.opt(data, "eventId"),
    });
    if (!parsed.success)
      return {
        ok: false,
        message: data.getAll("memberIds").length
          ? "Огноо, хичээлийн жилээ шалгана уу."
          : "Гишүүн сонгоно уу.",
      };
    const n = await addHoursEntries(await getDb(), user, parsed.data);
    revalidatePath("/admin/hours");
    return { ok: true, message: `${n} гишүүнд ${hours} цаг нэмлээ.` };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteHoursEntry(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const db = await getDb();
    const [row] = await db
      .delete(volunteerHours)
      .where(eq(volunteerHours.id, id))
      .returning({ id: volunteerHours.id, hours: volunteerHours.hours });
    if (!row) return { ok: false, message: "Олдсонгүй." };
    await logActivity(user, "hours.delete", {
      type: "hours",
      id,
      summary: `Цагийн бичлэг #${shortId(id)} (${row.hours} цаг) устгав`,
    });
    revalidatePath("/admin/hours");
    return { ok: true, message: "Устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
