"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { diffFields, logActivity, shortId } from "@/lib/admin/activity";
import { refreshPublicPages, revalidatePublic } from "@/lib/admin/revalidate";
import { assertAdmin } from "@/lib/auth/session";
import { deleteMediaUrls } from "@/lib/media/server";
import { memberInputSchema } from "@/lib/validation/admin";

export async function saveMember(
  id: string | null,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
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
      showPublicly: fd.bool(data, "showPublicly"),
      schoolYear: fd.str(data, "schoolYear"),
      volunteerHours: fd.str(data, "volunteerHours") === "" ? null : fd.int(data, "volunteerHours"),
      team: fd.str(data, "team"),
      email: fd.str(data, "email"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const input: typeof parsed.data & {
      consentConfirmedAt?: Date;
      consentConfirmedBy?: string;
    } = parsed.data;
    const db = await getDb();
    const [prev] = id ? await db.select().from(members).where(eq(members.id, id)).limit(1) : [];
    // Turning a name public needs the parents' / guardians' consent, confirmed by the admin.
    if (input.showPublicly && !prev?.showPublicly) {
      if (!fd.bool(data, "consent"))
        return {
          ok: false,
          message:
            "Нэрийг нийтлэхийн өмнө эцэг эх / асран хамгаалагч зөвшөөрснийг баталгаажуулна уу.",
          fieldErrors: { consent: ["Зөвшөөрлийг баталгаажуулна уу."] },
        };
      input.consentConfirmedAt = new Date();
      input.consentConfirmedBy = user.id;
    }
    if (id) {
      const res = await db
        .update(members)
        .set(input)
        .where(eq(members.id, id))
        .returning({ id: members.id });
      if (!res.length) return { ok: false, message: "Гишүүн олдсонгүй." };
      if (prev?.photoUrl && prev.photoUrl !== input.photoUrl)
        await deleteMediaUrls([prev.photoUrl]);
      await logActivity(user, "member.update", {
        type: "member",
        id,
        summary: `Гишүүн #${shortId(id)} — мэдээллийг засав`,
        changes: prev
          ? diffFields(
              prev,
              input,
              [
                "name",
                "role",
                "className",
                "group",
                "sortOrder",
                "active",
                "showPublicly",
                "showPhoto",
                "schoolYear",
                "volunteerHours",
                "team",
              ],
              ["name", "className", "team"],
            )
          : undefined,
      });
    } else {
      const [row] = await db.insert(members).values(input).returning({ id: members.id });
      await logActivity(user, "member.create", {
        type: "member",
        id: row!.id,
        summary: `Гишүүн #${shortId(row!.id)} нэмэв`,
      });
    }
    refreshPublicPages("members", NAME_PAGES);
  } catch (err) {
    return actionError(err);
  }
  redirect("/admin/members?saved=1");
}

export async function deleteMember(id: string): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const db = await getDb();
    const [row] = await db
      .delete(members)
      .where(eq(members.id, id))
      .returning({ photoUrl: members.photoUrl });
    if (!row) return { ok: false, message: "Гишүүн олдсонгүй." };
    await deleteMediaUrls([row.photoUrl]);
    await logActivity(user, "member.delete", {
      type: "member",
      id,
      summary: `Гишүүн #${shortId(id)} устгав`,
    });
    revalidatePublic("members");
    return { ok: true, message: "Гишүүн устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** Public pages that show members' names. */
const NAME_PAGES = ["/members", "/about"];

/**
 * Show or hide names on the public site («Нийтэд харуулах»), for one member or a selection.
 * Members are mostly minors: showing needs the admin's confirmation that a parent or guardian
 * agreed (`consent`), recorded with the time and the admin. The pages are refreshed at once.
 */
export async function setMembersPublic(
  ids: string[],
  show: boolean,
  consent: boolean,
): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const list = ids.filter((v) => typeof v === "string" && v);
    if (list.length === 0) return { ok: false, message: "Гишүүн сонгоно уу." };
    if (list.length > 500) return { ok: false, message: "Хэт олон гишүүн сонгосон байна." };
    if (show && !consent)
      return {
        ok: false,
        message: "Эцэг эх / асран хамгаалагч зөвшөөрсөн эсэхийг баталгаажуулна уу.",
      };
    const db = await getDb();
    const now = new Date();
    const res = await db
      .update(members)
      .set(
        show
          ? {
              showPublicly: true,
              consentConfirmedAt: now,
              consentConfirmedBy: user.id,
              updatedAt: now,
            }
          : { showPublicly: false, updatedAt: now },
      )
      .where(inArray(members.id, list))
      .returning({ id: members.id });
    await logActivity(user, "member.update", {
      type: "member",
      id: res.length === 1 ? res[0]!.id : null,
      summary:
        res.length === 1
          ? `Гишүүн #${shortId(res[0]!.id)} — нэрийг ${show ? "нийтэд харуулав (зөвшөөрөлтэй)" : "нийтээс нуув"}`
          : `${res.length} гишүүнийг ${show ? "нийтэд харуулав (зөвшөөрөлтэй)" : "нийтээс нуув"}`,
    });
    refreshPublicPages("members", NAME_PAGES);
    return {
      ok: true,
      message: show
        ? res.length === 1
          ? "Нэр нийтэд харагдах боллоо"
          : `${res.length} гишүүний нэр нийтэд харагдах боллоо`
        : res.length === 1
          ? "Нэр нуугдлаа"
          : `${res.length} гишүүний нэр нуугдлаа`,
    };
  } catch (err) {
    return actionError(err);
  }
}

/** ↑ / ↓ in the leadership order (swaps with the neighbour; no numbers to type). */
export async function moveMember(id: string, direction: "up" | "down"): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const db = await getDb();
    const [row] = await db.select().from(members).where(eq(members.id, id)).limit(1);
    if (!row) return { ok: false, message: "Гишүүн олдсонгүй." };
    const siblings = await db
      .select({ id: members.id, sortOrder: members.sortOrder })
      .from(members)
      .where(and(eq(members.group, row.group), eq(members.anonymized, false)))
      .orderBy(asc(members.sortOrder), asc(members.name));
    const i = siblings.findIndex((m) => m.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    const other = siblings[j];
    if (i < 0 || !other) return { ok: true };
    // Distinct positions first (imported rows may share a number), then swap.
    const order = siblings.map((m, k) => ({ id: m.id, sortOrder: k + 1 }));
    [order[i]!.sortOrder, order[j]!.sortOrder] = [order[j]!.sortOrder, order[i]!.sortOrder];
    const [first, ...rest] = order.map((m) =>
      db.update(members).set({ sortOrder: m.sortOrder }).where(eq(members.id, m.id)),
    );
    await db.batch([first!, ...rest]);
    await logActivity(user, "member.update", {
      type: "member",
      id,
      summary: `Гишүүн #${shortId(id)} — дарааллыг ${direction === "up" ? "дээшлүүлэв" : "доошлуулав"}`,
    });
    refreshPublicPages("members", NAME_PAGES);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
