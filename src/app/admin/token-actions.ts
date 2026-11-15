"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { account, rateLimit, session, user } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { hashPassword } from "@/lib/auth/password";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { isRole } from "@/lib/auth/roles";
import { consumeAuthToken, inspectAuthToken } from "@/lib/auth/token-store";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Public actions behind one-time links (no session): accepting an invitation and completing a
 * password reset. Authorization is the link itself — hashed in D1, 72 h, single use — plus a
 * per-IP rate limit against guessing.
 */

const STALE =
  "Холбоос хүчингүй болсон байна (хугацаа дууссан эсвэл аль хэдийн ашиглагдсан). Админаас шинэ холбоос авна уу.";

async function tooManyAttempts() {
  const ip = (await headers()).get("cf-connecting-ip") ?? "local";
  return !(await consumeRateLimit(`token:ip:${ip}`, 10, 15 * 60 * 1000)).allowed;
}

const inviteSchema = newPasswordSchema.and(
  z.object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Нэрээ оруулна уу." })
      .max(100, { error: "Нэр хэт урт байна." }),
  }),
);

export async function acceptInvite(
  token: string,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  if (await tooManyAttempts())
    return { ok: false, message: "Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу." };
  const parsed = inviteSchema.safeParse({
    name: fd.str(data, "name"),
    password: String(data.get("password") ?? ""),
    repeat: String(data.get("repeat") ?? ""),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { state, row: invite } = await inspectAuthToken("invite", token);
  if (state !== "valid" || !invite || !isRole(invite.role)) return { ok: false, message: STALE };
  const db = await getDb();
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, invite.email));
  if (existing)
    return { ok: false, message: "Энэ и-мэйлтэй бүртгэл аль хэдийн байна. Нэвтэрнэ үү." };

  // Hash first (slow), then claim the link atomically so it can only ever create one account.
  const hash = await hashPassword(parsed.data.password);
  if (!(await consumeAuthToken("invite", token))) return { ok: false, message: STALE };
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(user).values({
      id,
      name: parsed.data.name,
      email: invite.email,
      role: invite.role,
      emailVerified: true,
      banned: false,
    }),
    db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: hash,
    }),
  ]);
  await logActivity({ id }, "user.invite_accept", {
    type: "user",
    id,
    summary: `${invite.email} урилгыг хүлээн авч бүртгэлээ үүсгэв`,
  });
  redirect("/admin/login?welcome=1");
}

export async function completePasswordReset(
  token: string,
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  if (await tooManyAttempts())
    return { ok: false, message: "Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу." };
  const parsed = newPasswordSchema.safeParse({
    password: String(data.get("password") ?? ""),
    repeat: String(data.get("repeat") ?? ""),
  });
  if (!parsed.success) return validationError(parsed.error);

  const { state } = await inspectAuthToken("reset", token);
  if (state !== "valid") return { ok: false, message: STALE };
  const hash = await hashPassword(parsed.data.password);
  const reset = await consumeAuthToken("reset", token);
  if (!reset?.userId) return { ok: false, message: STALE };

  const db = await getDb();
  const updated = await db
    .update(account)
    .set({ password: hash })
    .where(and(eq(account.userId, reset.userId), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (updated.length === 0) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: reset.userId,
      providerId: "credential",
      userId: reset.userId,
      password: hash,
    });
  }
  // The old password may be known to someone else: end every session and clear the lockout.
  await db.delete(session).where(eq(session.userId, reset.userId));
  await db.delete(rateLimit).where(eq(rateLimit.key, `login:email:${reset.email}`));
  await logActivity({ id: reset.userId }, "user.password_reset", {
    type: "user",
    id: reset.userId,
    summary: `${reset.email} нэг удаагийн холбоосоор нууц үгээ шинэчлэв`,
  });
  redirect("/admin/login?reset=1");
}
