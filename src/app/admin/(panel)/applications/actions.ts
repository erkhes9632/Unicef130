"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, applicationStatuses, users } from "@/db/schema";
import { actionError, fd, type ActionState } from "@/lib/admin/action-state";
import { logActivity, shortId } from "@/lib/admin/activity";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { assertAdmin } from "@/lib/auth/session";
import { applyStatus, purgeApplications } from "@/lib/recruitment/admin-ops";
import { applicationStatusLabels } from "@/lib/recruitment/logic";

const statusSchema = z.enum(applicationStatuses);
const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(500);

export async function setApplicationStatus(id: string, status: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) return { ok: false, message: "Төлөв буруу." };
    const changed = await applyStatus(user, [id], parsed.data);
    if (changed === 0) return { ok: false, message: "Өргөдөл олдсонгүй эсвэл төлөв ижил байна." };
    revalidatePath("/admin/applications");
    return {
      ok: true,
      message:
        parsed.data === "accepted"
          ? "Тэнцсэн гэж тэмдэглэлээ: гишүүний эрх олгож, гишүүдийн жагсаалтад (нийтэд харагдахгүйгээр) нэмлээ."
          : "Төлөв шинэчлэгдлээ.",
    };
  } catch (err) {
    return actionError(err);
  }
}

/** Bulk status change for the selected applications. */
export async function bulkSetStatus(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const ids = idsSchema.safeParse(data.getAll("ids"));
    const status = statusSchema.safeParse(fd.str(data, "status"));
    if (!ids.success) return { ok: false, message: "Өргөдөл сонгоно уу." };
    if (!status.success) return { ok: false, message: "Төлөв сонгоно уу." };
    const changed = await applyStatus(user, ids.data, status.data);
    revalidatePath("/admin/applications");
    return {
      ok: true,
      message: `${changed} өргөдлийг «${applicationStatusLabels[status.data]}» болголоо.`,
    };
  } catch (err) {
    return actionError(err);
  }
}

export async function saveApplicationNotes(
  id: string,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const notes = fd.str(data, "notes").slice(0, 2000);
    const db = await getDb();
    await db.update(applications).set({ notes }).where(eq(applications.id, id));
    await logActivity(user, "application.notes", {
      type: "application",
      id,
      summary: `Өргөдөл #${shortId(id)} — тэмдэглэл засав`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: "Тэмдэглэл хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** The optional message the applicant sees with the decision on /join. */
export async function saveDecisionMessage(
  id: string,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const decisionMessage = fd.str(data, "decisionMessage").slice(0, 1000);
    const db = await getDb();
    const res = await db
      .update(applications)
      .set({ decisionMessage })
      .where(eq(applications.id, id))
      .returning({ id: applications.id });
    if (!res.length) return { ok: false, message: "Өргөдөл олдсонгүй." };
    await logActivity(user, "application.message", {
      type: "application",
      id,
      summary: `Өргөдөл #${shortId(id)} — мессеж ${decisionMessage ? "бичив" : "арилгав"}`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: "Мессеж хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** "Дахин өргөдөл гаргахыг хориглох": the account can't send new applications (abuse). */
export async function setApplyBlocked(userId: string, blocked: boolean): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const db = await getDb();
    const res = await db
      .update(users)
      .set({ applyBlocked: blocked, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!res.length) return { ok: false, message: "Бүртгэл олдсонгүй." };
    await logActivity(me, blocked ? "user.apply_block" : "user.apply_unblock", {
      type: "user",
      id: userId,
      summary: `Бүртгэл #${shortId(userId)} — өргөдөл гаргахыг ${blocked ? "хориглов" : "зөвшөөрөв"}`,
    });
    revalidatePath("/admin/applications");
    revalidatePath("/admin/users");
    // Accepting changes public numbers (members, places left in the recruitment banner).
    revalidatePublic("applications");
    return {
      ok: true,
      message: blocked ? "Дахин өргөдөл гаргахыг хориглолоо." : "Хоригийг цуцаллаа.",
    };
  } catch (err) {
    return actionError(err);
  }
}

export async function retryApplicationSync(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const result = await syncApplicationToSheets(id);
    revalidatePath("/admin/applications");
    if (result === "synced") return { ok: true, message: "Google Sheets-д нэмэгдлээ." };
    if (result === "skipped")
      return { ok: false, message: "Google Sheets тохируулагдаагүй байна." };
    return { ok: false, message: "Sync амжилтгүй. Алдааг өргөдөл дээрээс харна уу." };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteApplication(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    if ((await purgeApplications(await getDb(), user, [id])) === 0)
      return { ok: false, message: "Өргөдөл олдсонгүй." };
    revalidatePath("/admin/applications");
    return { ok: true, message: "Өргөдөл устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
