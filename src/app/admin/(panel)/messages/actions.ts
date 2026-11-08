"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, type ActionState } from "@/lib/admin/action-state";
import { requireRole } from "@/lib/auth/session";

export async function setMessageRead(id: string, read: boolean): Promise<ActionState> {
  try {
    await requireRole("editor");
    const db = await getDb();
    await db
      .update(contactMessages)
      .set({ readAt: read ? new Date() : null })
      .where(eq(contactMessages.id, id));
    revalidatePath("/admin/messages");
    return { ok: true, message: read ? "Уншсан гэж тэмдэглэлээ." : "Уншаагүй болголоо." };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteMessage(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const db = await getDb();
    const [row] = await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, id))
      .returning({ name: contactMessages.name });
    if (!row) return { ok: false, message: "Зурвас олдсонгүй." };
    await logActivity(user, "message.delete", {
      type: "message",
      id,
      summary: `${row.name}-ийн зурвасыг устгав`,
    });
    revalidatePath("/admin/messages");
    return { ok: true, message: "Зурвас устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
