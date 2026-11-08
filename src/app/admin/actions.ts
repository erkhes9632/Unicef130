"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

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

  const auth = await getAuth();
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) {
      return {
        error: "И-мэйл эсвэл нууц үг буруу, эсвэл бүртгэл идэвхгүй байна.",
        email: parsed.data.email,
      };
    }
    console.error("[auth] sign-in failed", err);
    return { error: "Алдаа гарлаа. Дахин оролдоно уу.", email: parsed.data.email };
  }
  redirect("/admin");
}

export async function logoutAction() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
