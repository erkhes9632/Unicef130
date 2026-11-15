"use server";

import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { authTokens, session, twoFactor, user, userRoles, type UserRole } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { roleLabels } from "@/lib/auth/roles";
import { requirePermission } from "@/lib/auth/session";
import { createAuthToken } from "@/lib/auth/token-store";
import { isEmailConfigured, sendEmail } from "@/lib/integrations/email";
import { getSiteUrl } from "@/lib/seo";

/** `link` is shown once, right after it was created (only its hash is stored). */
export type LinkActionState = ActionState & { link?: string; email?: string; emailed?: boolean };

const inviteSchema = z.object({
  email: z.email({ error: "И-мэйл буруу." }).max(254),
  role: z.enum(userRoles, { error: "Эрх сонгоно уу." }),
});

async function otherActiveAdmins(excludeId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(user)
    .where(
      and(
        eq(user.role, "admin"),
        or(eq(user.banned, false), isNull(user.banned)),
        ne(user.id, excludeId),
      ),
    );
  return row?.n ?? 0;
}

/** Creates a one-time invitation link (72 h). The invitee sets their own password. */
export async function inviteUser(_prev: LinkActionState, data: FormData): Promise<LinkActionState> {
  try {
    const me = await requirePermission("admin");
    const parsed = inviteSchema.safeParse({
      email: fd.str(data, "email").toLowerCase(),
      role: fd.str(data, "role"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const { email, role } = parsed.data;
    const db = await getDb();
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (existing) return { ok: false, message: "Энэ и-мэйлтэй хэрэглэгч аль хэдийн байна." };

    const { token } = await createAuthToken({ kind: "invite", email, role, createdBy: me.id });
    const link = `${await getSiteUrl()}/admin/invite/${token}`;
    const emailed =
      (await isEmailConfigured()) &&
      (await sendEmail({
        to: email,
        subject: "Админ хэсгийн урилга",
        text: `Сайн байна уу,\n\nТаныг клубын вэбсайтын админ хэсэгт «${roleLabels[role]}» эрхээр урьж байна. Доорх холбоосоор орж нууц үгээ тохируулна уу (72 цаг хүчинтэй, нэг удаа ашиглана):\n\n${link}\n`,
      }));
    await logActivity(me, "user.invite", {
      type: "user",
      summary: `${email} хаягийг «${roleLabels[role]}» эрхээр урив`,
    });
    revalidatePath("/admin/users");
    return {
      ok: true,
      message: emailed
        ? "Урилгыг и-мэйлээр илгээлээ. Холбоосыг доороос хуулж бас болно."
        : "Урилгын холбоос үүслээ. Одоо л нэг удаа харагдана — хуулж аваад тухайн хүнд илгээнэ үү.",
      link,
      email,
      emailed,
    };
  } catch (err) {
    return actionError(err);
  }
}

export async function revokeInvite(id: string): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    const db = await getDb();
    const [row] = await db
      .delete(authTokens)
      .where(and(eq(authTokens.id, id), isNull(authTokens.usedAt)))
      .returning({ email: authTokens.email, kind: authTokens.kind });
    if (!row) return { ok: false, message: "Холбоос олдсонгүй эсвэл аль хэдийн ашиглагдсан." };
    await logActivity(me, "user.invite_revoke", {
      type: "user",
      summary: `${row.email} — ${row.kind === "invite" ? "урилгыг" : "нууц үг сэргээх холбоосыг"} цуцлав`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Холбоос цуцлагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

/** One-time password reset link for an existing user (same rules as invitations). */
export async function createResetLink(id: string): Promise<LinkActionState> {
  try {
    const me = await requirePermission("admin");
    const db = await getDb();
    const [target] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!target) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    const { token } = await createAuthToken({
      kind: "reset",
      email: target.email,
      userId: id,
      createdBy: me.id,
    });
    await logActivity(me, "user.reset_link", {
      type: "user",
      id,
      summary: `${target.email} — нууц үг сэргээх холбоос үүсгэв`,
    });
    revalidatePath("/admin/users");
    return {
      ok: true,
      message: "Нууц үг сэргээх холбоос (72 цаг, нэг удаа). Одоо л харагдана — хуулж илгээнэ үү.",
      link: `${await getSiteUrl()}/admin/reset/${token}`,
      email: target.email,
    };
  } catch (err) {
    return actionError(err);
  }
}

export async function setUserRole(id: string, role: UserRole): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    if (!(userRoles as readonly string[]).includes(role))
      return { ok: false, message: "Эрх буруу." };
    if (id === me.id) return { ok: false, message: "Өөрийнхөө эрхийг өөрчлөх боломжгүй." };
    const db = await getDb();
    const [before] = await db
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!before) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    if (before.role === "admin" && role !== "admin" && (await otherActiveAdmins(id)) === 0) {
      return { ok: false, message: "Дор хаяж нэг идэвхтэй админ байх ёстой." };
    }
    await db.update(user).set({ role }).where(eq(user.id, id));
    // A changed role takes effect immediately on every device.
    await db.delete(session).where(eq(session.userId, id));
    await logActivity(me, "user.role", {
      type: "user",
      id,
      summary: `${before.email} хэрэглэгчийн эрхийг өөрчлөв`,
      changes: { role: [before.role, role] },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Эрх шинэчлэгдлээ." };
  } catch (err) {
    return actionError(err);
  }
}

export async function setUserDisabled(id: string, disabled: boolean): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    if (id === me.id) return { ok: false, message: "Өөрийгөө идэвхгүй болгох боломжгүй." };
    const db = await getDb();
    const [target] = await db
      .select({ role: user.role, email: user.email, banned: user.banned })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!target) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    if (disabled && target.role === "admin" && (await otherActiveAdmins(id)) === 0) {
      return { ok: false, message: "Дор хаяж нэг идэвхтэй админ байх ёстой." };
    }
    await db.update(user).set({ banned: disabled }).where(eq(user.id, id));
    // Sign the user out everywhere.
    if (disabled) await db.delete(session).where(eq(session.userId, id));
    await logActivity(me, disabled ? "user.disable" : "user.enable", {
      type: "user",
      id,
      summary: `${target.email} бүртгэлийг ${disabled ? "идэвхгүй болгов" : "идэвхжүүлэв"}`,
      changes: { disabled: [target.banned === true, disabled] },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: disabled ? "Хэрэглэгч идэвхгүй боллоо." : "Хэрэглэгч идэвхжлээ." };
  } catch (err) {
    return actionError(err);
  }
}

/** Force logout: ends every session of the user on all devices. */
export async function revokeUserSessions(id: string): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    const db = await getDb();
    const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
    if (!target) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    const ended = await db
      .delete(session)
      .where(eq(session.userId, id))
      .returning({ id: session.id });
    await logActivity(me, "user.sessions_revoke", {
      type: "user",
      id,
      summary: `${target.email} — бүх төхөөрөмжөөс гаргав (${ended.length} session)`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `${ended.length} session дуусгавар боллоо.` };
  } catch (err) {
    return actionError(err);
  }
}

/** For a user who lost their authenticator: removes two-factor so they can enrol again. */
export async function resetUserTwoFactor(id: string): Promise<ActionState> {
  try {
    const me = await requirePermission("admin");
    if (id === me.id)
      return { ok: false, message: "Өөрийнхөө 2FA-г «Миний профайл» хэсгээс удирдана." };
    const db = await getDb();
    const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
    if (!target) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    await db.batch([
      db.delete(twoFactor).where(eq(twoFactor.userId, id)),
      db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, id)),
      db.delete(session).where(eq(session.userId, id)),
    ]);
    await logActivity(me, "user.two_factor_reset", {
      type: "user",
      id,
      summary: `${target.email} — 2 шатлалт баталгаажуулалтыг арилгав`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "2FA арилгагдлаа. Хэрэглэгч дахин нэвтэрч шинээр тохируулна." };
  } catch (err) {
    return actionError(err);
  }
}
