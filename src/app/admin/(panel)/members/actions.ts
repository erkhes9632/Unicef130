"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";
import { memberInputSchema } from "@/lib/validation/admin";

export async function saveMember(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const parsed = memberInputSchema.safeParse({
      name: fd.str(data, "name"),
      nameEn: fd.str(data, "nameEn"),
      role: fd.str(data, "role"),
      roleEn: fd.str(data, "roleEn"),
      className: fd.str(data, "className"),
      group: fd.str(data, "group") === "leadership" ? "leadership" : "member",
      sortOrder: fd.int(data, "sortOrder", 0),
      photoUrl: fd.str(data, "photoUrl"),
      showPhoto: fd.bool(data, "showPhoto"),
      active: fd.bool(data, "active"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const db = await getDb();
    if (id) {
      const res = await db
        .update(members)
        .set(input)
        .where(eq(members.id, id))
        .returning({ id: members.id });
      if (!res.length) return { ok: false, message: "Гишүүн олдсонгүй." };
      await logActivity(user, "member.update", {
        type: "member",
        id,
        summary: `${input.name} гишүүний мэдээллийг засав`,
      });
    } else {
      const [row] = await db.insert(members).values(input).returning({ id: members.id });
      await logActivity(user, "member.create", {
        type: "member",
        id: row!.id,
        summary: `${input.name} гишүүнийг нэмэв`,
      });
    }
    revalidatePublic();
  } catch (err) {
    return actionError(err);
  }
  redirect("/admin/members?saved=1");
}

export async function deleteMember(id: string): Promise<ActionState> {
  try {
    const user = await requireRole("editor");
    const db = await getDb();
    const [row] = await db
      .delete(members)
      .where(eq(members.id, id))
      .returning({ name: members.name });
    if (!row) return { ok: false, message: "Гишүүн олдсонгүй." };
    await logActivity(user, "member.delete", {
      type: "member",
      id,
      summary: `${row.name} гишүүнийг устгав`,
    });
    revalidatePublic();
    return { ok: true, message: "Гишүүн устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
