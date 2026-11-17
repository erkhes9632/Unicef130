"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { actionError, type ActionState } from "@/lib/admin/action-state";
import { logActivity, shortId } from "@/lib/admin/activity";
import { roleLabel, toRole } from "@/lib/auth/roles";
import { assertAdmin, refreshUserFromClerk } from "@/lib/auth/session";
import { memberDisplayName } from "@/lib/recruitment/logic";
import { countActiveAdmins, deleteClerkUser, setBanned, setRole } from "@/lib/users/clerk-admin";
import { removeUserData } from "@/lib/users/delete";
import {
  checkUserAction,
  roleAfter,
  userActionRefusalMessages,
  type UserAction,
} from "@/lib/users/rules";
import { findUser } from "@/lib/users/sync";

const roleActions = ["make-admin", "make-member", "remove-role"] as const;

/** Loads the target account (repairing the D1 row from Clerk if needed) and runs the guards. */
async function guarded(actorId: string, userId: string, action: UserAction) {
  const db = await getDb();
  const target = (await findUser(db, userId)) ?? (await refreshUserFromClerk(userId));
  if (!target) return { db, refusal: "Бүртгэл олдсонгүй." } as const;
  const refusal = checkUserAction({
    actorId,
    target: { id: target.id, role: toRole(target.role), banned: target.banned },
    action,
    adminCount: await countActiveAdmins(db),
  });
  return { db, target, refusal: refusal ? userActionRefusalMessages[refusal] : null } as const;
}

function revalidateUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/members");
}

/** Make admin / make member / remove role (role lives in Clerk; D1 mirrors it). */
export async function changeUserRole(userId: string, action: string): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    if (!(roleActions as readonly string[]).includes(action))
      return { ok: false, message: "Үйлдэл буруу." };
    const act = action as (typeof roleActions)[number];
    const { db, target, refusal } = await guarded(me.id, userId, act);
    if (refusal || !target) return { ok: false, message: refusal ?? "Бүртгэл олдсонгүй." };

    const next = roleAfter(act, toRole(target.role));
    if (next === "member") {
      const [linked] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);
      if (linked) {
        await db.update(members).set({ active: true }).where(eq(members.id, linked.id));
      } else {
        // Never link silently: an imported member with this e-mail is offered as a button.
        const [match] = target.email
          ? await db
              .select({ id: members.id })
              .from(members)
              .where(and(eq(members.email, target.email), isNull(members.userId)))
              .limit(1)
          : [];
        if (match)
          return {
            ok: false,
            message:
              "Энэ и-мэйлтэй гишүүний бүртгэл байна. Давхардуулахгүйн тулд «Гишүүнтэй холбох»-ыг ашиглана уу.",
          };
        await db.insert(members).values({
          name: memberDisplayName(target.name) || target.email,
          role: "Гишүүн",
          roleEn: "Member",
          group: "member",
          showPublicly: false,
          sortOrder: 500,
          userId,
          email: target.email || null,
        });
      }
    }
    await setRole(db, userId, next);
    await logActivity(me, "user.role", {
      type: "user",
      id: userId,
      summary: `Бүртгэл #${shortId(userId)} — эрх: ${roleLabel(next)}`,
      changes: { role: [roleLabel(toRole(target.role)), roleLabel(next)] },
    });
    revalidateUsers();
    return { ok: true, message: `Эрх шинэчлэгдлээ: ${roleLabel(next)}.` };
  } catch (err) {
    return actionError(err);
  }
}

/** Идэвхгүй болгох / Идэвхжүүлэх: Clerk ban (can't sign in, data kept, reversible). */
export async function setUserBanned(userId: string, banned: boolean): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const { db, target, refusal } = await guarded(me.id, userId, banned ? "ban" : "unban");
    if (refusal || !target) return { ok: false, message: refusal ?? "Бүртгэл олдсонгүй." };
    await setBanned(db, userId, banned);
    await logActivity(me, banned ? "user.ban" : "user.unban", {
      type: "user",
      id: userId,
      summary: `Бүртгэл #${shortId(userId)} — ${banned ? "идэвхгүй болгов" : "идэвхжүүлэв"}`,
    });
    revalidateUsers();
    return { ok: true, message: banned ? "Бүртгэлийг идэвхгүй болголоо." : "Бүртгэл идэвхжлээ." };
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Бүр мөсөн устгах: the Clerk user is deleted first (so the person can't sign in again with
 * half-deleted data), then the D1 personal data. The admin must retype the account's e-mail.
 */
export async function deleteUserAccount(
  userId: string,
  confirmEmail: string,
): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const { db, target, refusal } = await guarded(me.id, userId, "delete");
    if (refusal || !target) return { ok: false, message: refusal ?? "Бүртгэл олдсонгүй." };
    if (confirmEmail.trim().toLowerCase() !== target.email.toLowerCase())
      return { ok: false, message: "Баталгаажуулах и-мэйл таарахгүй байна." };
    await deleteClerkUser(userId);
    await removeUserData(db, userId, me);
    revalidateUsers();
    return { ok: true, message: "Бүртгэл болон хувийн мэдээлэл устгагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/**
 * Links an account to an existing member record (e.g. one of the imported members) and gives
 * it the member role. Only ever done by an admin, one click at a time.
 */
export async function linkAccountToMember(userId: string, memberId: string): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const db = await getDb();
    const target = (await findUser(db, userId)) ?? (await refreshUserFromClerk(userId));
    if (!target) return { ok: false, message: "Бүртгэл олдсонгүй." };
    const [member] = await db
      .select({ id: members.id, userId: members.userId, anonymized: members.anonymized })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);
    if (!member || member.anonymized) return { ok: false, message: "Гишүүн олдсонгүй." };
    if (member.userId && member.userId !== userId)
      return { ok: false, message: "Энэ гишүүн өөр бүртгэлтэй холбогдсон байна." };
    const [already] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);
    if (already && already.id !== memberId)
      return { ok: false, message: "Энэ бүртгэл өөр гишүүнтэй холбогдсон байна." };

    await db
      .update(members)
      .set({ userId, active: true, updatedAt: new Date() })
      .where(eq(members.id, memberId));
    if (!toRole(target.role)) await setRole(db, userId, "member");
    await logActivity(me, "user.link_member", {
      type: "user",
      id: userId,
      summary: `Бүртгэл #${shortId(userId)} — гишүүн #${shortId(memberId)}-тэй холбов`,
    });
    revalidateUsers();
    return { ok: true, message: "Бүртгэлийг гишүүнтэй холболоо." };
  } catch (err) {
    return actionError(err);
  }
}

/** Re-reads an account from Clerk (e.g. when a webhook was missed). */
export async function refreshUser(userId: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const row = await refreshUserFromClerk(userId);
    revalidateUsers();
    return row
      ? { ok: true, message: "Clerk-ээс шинэчиллээ." }
      : { ok: false, message: "Олдсонгүй." };
  } catch (err) {
    return actionError(err);
  }
}
