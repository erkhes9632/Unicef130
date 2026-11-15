"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import {
  activityLog,
  applicationBlocks,
  applications,
  applicationStatuses,
  members,
  recruitmentPeriods,
  user,
  type ApplicationStatus,
} from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { actionError, fd, type ActionState } from "@/lib/admin/action-state";
import { syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { can } from "@/lib/auth/roles";
import { requirePermission } from "@/lib/auth/session";
import { applicationStatusLabels, memberDisplayName } from "@/lib/recruitment/logic";

const statusSchema = z.enum(applicationStatuses);
const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(500);

/**
 * An accepted applicant becomes a member of the period's school year (once). The member is not
 * listed publicly until an admin switches the consent flag on.
 */
async function ensureMember(applicationId: string) {
  const db = await getDb();
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app || app.memberId) return null;
  const [period] = app.periodId
    ? await db
        .select({ schoolYear: recruitmentPeriods.schoolYear })
        .from(recruitmentPeriods)
        .where(eq(recruitmentPeriods.id, app.periodId))
        .limit(1)
    : [];
  const [member] = await db
    .insert(members)
    .values({
      name: memberDisplayName(app.fullName),
      role: "Гишүүн",
      roleEn: "Member",
      className: app.className,
      group: "member",
      showPublicly: false,
      showPhoto: false,
      active: true,
      sortOrder: 500,
      schoolYear: period?.schoolYear ?? null,
    })
    .returning({ id: members.id });
  await db
    .update(applications)
    .set({ memberId: member!.id })
    .where(eq(applications.id, applicationId));
  return member!.id;
}

async function applyStatus(
  actor: { id: string },
  ids: string[],
  status: ApplicationStatus,
): Promise<number> {
  const db = await getDb();
  const before = await db
    .select({ id: applications.id, status: applications.status, flags: applications.spamFlags })
    .from(applications)
    .where(inArray(applications.id, ids));
  let changed = 0;
  for (const row of before) {
    if (row.status === status) continue;
    const flags =
      status === "spam"
        ? [...new Set([...row.flags, "marked_by_admin"])]
        : row.flags.filter((f) => f !== "marked_by_admin");
    await db
      .update(applications)
      .set({ status, spamFlags: flags })
      .where(eq(applications.id, row.id));
    if (status === "accepted") await ensureMember(row.id);
    // The log refers to applications by id only: no names of minors in the audit trail.
    await logActivity(actor, "application.status", {
      type: "application",
      id: row.id,
      summary: `Өргөдөл #${shortId(row.id)} — төлөв өөрчлөв`,
      changes: { status: [row.status, status] },
    });
    changed++;
  }
  return changed;
}

export async function setApplicationStatus(id: string, status: string): Promise<ActionState> {
  try {
    const user = await requirePermission("applications");
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) return { ok: false, message: "Төлөв буруу." };
    const db = await getDb();
    const [exists] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    if (!exists) return { ok: false, message: "Өргөдөл олдсонгүй." };
    await applyStatus(user, [id], parsed.data);
    revalidatePath("/admin/applications");
    return {
      ok: true,
      message:
        parsed.data === "accepted"
          ? "Элссэн гэж тэмдэглэлээ. Гишүүдийн жагсаалтад (нийтэд харагдахгүйгээр) нэмэгдлээ."
          : "Төлөв шинэчлэгдлээ.",
    };
  } catch (err) {
    return actionError(err);
  }
}

/** Bulk status change for the selected applications (also "mark as spam" / "not spam"). */
export async function bulkSetStatus(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await requirePermission("applications");
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
    const user = await requirePermission("applications");
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

/** Assigns (or clears) the reviewer; only users who may see applications can be assigned. */
export async function assignReviewer(id: string, reviewerId: string): Promise<ActionState> {
  try {
    const me = await requirePermission("applications");
    const db = await getDb();
    if (reviewerId) {
      const [target] = await db
        .select({ role: user.role, banned: user.banned })
        .from(user)
        .where(eq(user.id, reviewerId))
        .limit(1);
      if (!target || target.banned || !can(target.role, "applications"))
        return { ok: false, message: "Энэ хэрэглэгч өргөдөл хянах эрхгүй." };
    }
    const res = await db
      .update(applications)
      .set({ reviewerId: reviewerId || null })
      .where(eq(applications.id, id))
      .returning({ id: applications.id });
    if (!res.length) return { ok: false, message: "Өргөдөл олдсонгүй." };
    await logActivity(me, "application.reviewer", {
      type: "application",
      id,
      summary: `Өргөдөл #${shortId(id)} — хянагч ${reviewerId ? "оноов" : "хасав"}`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: reviewerId ? "Хянагч оноогдлоо." : "Хянагчийг хаслаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function retryApplicationSync(id: string): Promise<ActionState> {
  try {
    await requirePermission("applications");
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

/** Blocks the applicant's phone or network address from applying for N days (admin only). */
export async function blockSender(
  id: string,
  kind: "phone" | "ip",
  days: number,
): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    if (kind !== "phone" && kind !== "ip") return { ok: false, message: "Төрөл буруу." };
    const span = Math.min(365, Math.max(1, Math.floor(days) || 30));
    const db = await getDb();
    const [app] = await db
      .select({ phone: applications.phoneNormalized, ipHash: applications.ipHash })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    const value = kind === "phone" ? app?.phone : app?.ipHash;
    if (!value) return { ok: false, message: "Энэ өргөдөлд блоклох мэдээлэл алга." };
    const expiresAt = new Date(Date.now() + span * 86_400_000);
    await db
      .insert(applicationBlocks)
      .values({ kind, value, reason: `Өргөдөл #${shortId(id)}`, expiresAt, createdBy: me.id })
      .onConflictDoUpdate({
        target: [applicationBlocks.kind, applicationBlocks.value],
        set: { expiresAt, createdBy: me.id },
      });
    await logActivity(me, "application.block", {
      type: "application",
      id,
      summary: `Өргөдөл #${shortId(id)} — ${kind === "phone" ? "утсыг" : "сүлжээг"} ${span} хоног блоклов`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: `${span} хоногийн турш блоклогдлоо.` };
  } catch (err) {
    return actionError(err);
  }
}

export async function removeBlock(blockId: string): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    const db = await getDb();
    const [row] = await db
      .delete(applicationBlocks)
      .where(eq(applicationBlocks.id, blockId))
      .returning({ kind: applicationBlocks.kind });
    if (!row) return { ok: false, message: "Блок олдсонгүй." };
    await logActivity(me, "application.unblock", {
      type: "application",
      summary: `${row.kind === "phone" ? "Утасны" : "Сүлжээний"} блокыг авав`,
    });
    revalidatePath("/admin/applications");
    return { ok: true, message: "Блок авагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

async function purge(actor: { id: string }, ids: string[]) {
  const db = await getDb();
  const deleted = await db
    .delete(applications)
    .where(inArray(applications.id, ids))
    .returning({ id: applications.id });
  if (deleted.length === 0) return 0;
  // Deleting personal data also removes the trail that pointed at it; one neutral row remains.
  await db.delete(activityLog).where(
    and(
      eq(activityLog.entityType, "application"),
      inArray(
        activityLog.entityId,
        deleted.map((d) => d.id),
      ),
    ),
  );
  await logActivity(actor, "application.delete", {
    type: "application",
    summary:
      deleted.length === 1
        ? `Өргөдөл #${shortId(deleted[0]!.id)} устгав`
        : `${deleted.length} өргөдөл устгав`,
  });
  return deleted.length;
}

/** Deleting personal data of minors is admin-only. */
export async function deleteApplication(id: string): Promise<ActionState> {
  try {
    const user = await requirePermission("admin");
    if ((await purge(user, [id])) === 0) return { ok: false, message: "Өргөдөл олдсонгүй." };
    revalidatePath("/admin/applications");
    return { ok: true, message: "Өргөдөл устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** Bulk delete — only applications currently marked as spam are removed. */
export async function bulkDeleteSpam(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await requirePermission("admin");
    const ids = idsSchema.safeParse(data.getAll("ids"));
    if (!ids.success) return { ok: false, message: "Өргөдөл сонгоно уу." };
    const db = await getDb();
    const spam = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(inArray(applications.id, ids.data), eq(applications.status, "spam")));
    if (spam.length === 0)
      return { ok: false, message: "Сонгосон өргөдлүүдийн дунд спам гэж тэмдэглэсэн нь алга." };
    const n = await purge(
      user,
      spam.map((s) => s.id),
    );
    revalidatePath("/admin/applications");
    return { ok: true, message: `${n} спам өргөдөл устгагдлаа.` };
  } catch (err) {
    return actionError(err);
  }
}
