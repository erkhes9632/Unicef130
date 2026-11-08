"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, applicationStatuses } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, type ActionState } from "@/lib/admin/action-state";
import { syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { requireRole } from "@/lib/auth/session";

export async function setApplicationStatus(id: string, status: string): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const parsed = z.enum(applicationStatuses).safeParse(status);
    if (!parsed.success) return { ok: false, message: "Төлөв буруу." };
    const db = await getDb();
    const [row] = await db
      .update(applications)
      .set({ status: parsed.data })
      .where(eq(applications.id, id))
      .returning({ fullName: applications.fullName });
    if (!row) return { ok: false, message: "Өргөдөл олдсонгүй." };
    await logActivity(user, "application.status", {
      type: "application",
      id,
      summary: `${row.fullName}: ${parsed.data}`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: "Төлөв шинэчлэгдлээ." };
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
    await requireRole("editor");
    const notes = fd.str(data, "notes").slice(0, 2000);
    const db = await getDb();
    await db.update(applications).set({ notes }).where(eq(applications.id, id));
    revalidatePath("/admin/applications");
    return { ok: true, message: "Тэмдэглэл хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function retryApplicationSync(id: string): Promise<ActionState> {
  try {
    await requireRole("editor");
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

/** Deleting personal data of minors is admin-only. */
export async function deleteApplication(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const db = await getDb();
    const [row] = await db
      .delete(applications)
      .where(eq(applications.id, id))
      .returning({ fullName: applications.fullName });
    if (!row) return { ok: false, message: "Өргөдөл олдсонгүй." };
    await logActivity(user, "application.delete", {
      type: "application",
      id,
      summary: `${row.fullName}-ийн өргөдлийг устгав`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: "Өргөдөл устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
