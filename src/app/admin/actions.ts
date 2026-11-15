"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { clearLoginFailures, loginBlockedFor, recordLoginFailure } from "@/lib/auth/login-limit";

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export type LoginState = { error?: string; email?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "И-мэйл болон нууц үгээ зөв оруулна уу." };

  const h = await headers();
  const ip = h.get("cf-connecting-ip");
  const { email } = parsed.data;
  const wait = await loginBlockedFor(email, ip);
  if (wait > 0) {
    return {
      error: `Хэт олон удаа буруу оролдсон байна. ${wait} минутын дараа дахин оролдоно уу.`,
      email,
    };
  }

  const auth = await getAuth();
  let needsCode = false;
  try {
    const result = await auth.api.signInEmail({ body: parsed.data, headers: h });
    await clearLoginFailures(email);
    // Password accepted; accounts with two-factor continue on the code screen (no session yet).
    needsCode = "twoFactorRedirect" in result && result.twoFactorRedirect === true;
  } catch (err) {
    if (err instanceof APIError) {
      await recordLoginFailure(email, ip);
      return {
        error: "И-мэйл эсвэл нууц үг буруу, эсвэл бүртгэл идэвхгүй байна.",
        email: parsed.data.email,
      };
    }
    console.error("[auth] sign-in failed", err);
    return { error: "Алдаа гарлаа. Дахин оролдоно уу.", email: parsed.data.email };
  }
  redirect(needsCode ? "/admin/login/two-factor" : "/admin");
}

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, { error: "Кодоо оруулна уу." })
    .max(20, { error: "Код буруу байна." }),
  backup: z.boolean(),
});

/** Second login step: a 6-digit authenticator code, or one of the backup codes. */
export async function verifyTwoFactorAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = codeSchema.safeParse({
    code: String(formData.get("code") ?? "").replace(/\s+/g, ""),
    backup: formData.get("backup") === "1",
  });
  if (!parsed.success) return { error: "Кодоо зөв оруулна уу." };
  const auth = await getAuth();
  const h = await headers();
  try {
    if (parsed.data.backup) {
      await auth.api.verifyBackupCode({ body: { code: parsed.data.code }, headers: h });
    } else {
      await auth.api.verifyTOTP({ body: { code: parsed.data.code }, headers: h });
    }
  } catch (err) {
    if (err instanceof APIError) {
      return {
        error: parsed.data.backup
          ? "Нөөц код буруу эсвэл аль хэдийн ашиглагдсан байна."
          : "Код буруу эсвэл хугацаа нь дууссан байна. Хэт олон буруу оролдвол бүртгэл 15 минут түгжигдэнэ.",
      };
    }
    console.error("[auth] two-factor verification failed", err);
    return { error: "Алдаа гарлаа. Дахин нэвтэрч оролдоно уу." };
  }
  redirect("/admin");
}

export async function logoutAction() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
