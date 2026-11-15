"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { actionError, validationError, type ActionState } from "@/lib/admin/action-state";
import { getAuth } from "@/lib/auth";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { requireSession } from "@/lib/auth/session";

/**
 * "My profile" actions: every signed-in user manages only their own account here, so these use
 * requireSession() (no role needed, and available before two-factor setup is finished).
 */

const WRONG_PASSWORD = "Одоогийн нууц үг буруу байна.";

export async function changeOwnPassword(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const me = await requireSession();
    const parsed = newPasswordSchema.safeParse({
      password: String(data.get("password") ?? ""),
      repeat: String(data.get("repeat") ?? ""),
    });
    if (!parsed.success) return validationError(parsed.error);
    const auth = await getAuth();
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: String(data.get("current") ?? ""),
          newPassword: parsed.data.password,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      });
    } catch (err) {
      if (err instanceof APIError) return { ok: false, message: WRONG_PASSWORD };
      throw err;
    }
    await logActivity(me, "profile.password", {
      type: "user",
      id: me.id,
      summary: "Өөрийн нууц үгийг сольж, бусад төхөөрөмжөөс гарав",
    });
    return { ok: true, message: "Нууц үг солигдлоо. Бусад төхөөрөмжөөс гарлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function signOutOtherDevices(): Promise<ActionState> {
  try {
    const me = await requireSession();
    const auth = await getAuth();
    await auth.api.revokeOtherSessions({ headers: await headers() });
    await logActivity(me, "profile.sessions_revoke", {
      type: "user",
      id: me.id,
      summary: "Бусад төхөөрөмжөөс гарав",
    });
    revalidatePath("/admin/profile");
    return { ok: true, message: "Бусад бүх төхөөрөмжөөс гарлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export type TwoFactorSetupState = ActionState & { totpURI?: string; backupCodes?: string[] };

/** Step 1: confirm the password → get the authenticator secret (QR) and backup codes. */
export async function startTwoFactorSetup(
  _prev: TwoFactorSetupState,
  data: FormData,
): Promise<TwoFactorSetupState> {
  try {
    await requireSession();
    const auth = await getAuth();
    try {
      const res = await auth.api.enableTwoFactor({
        body: { password: String(data.get("password") ?? "") },
        headers: await headers(),
      });
      if (res.method !== "totp") return { ok: false, message: "2FA тохируулж чадсангүй." };
      return { ok: true, totpURI: res.totpURI, backupCodes: res.backupCodes };
    } catch (err) {
      if (err instanceof APIError) return { ok: false, message: WRONG_PASSWORD };
      throw err;
    }
  } catch (err) {
    return actionError(err);
  }
}

const codeSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: "6 оронтой кодоо оруулна уу." }));

/** Step 2: the first valid code from the app switches two-factor on. */
export async function confirmTwoFactorSetup(
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const me = await requireSession();
    const code = codeSchema.safeParse(String(data.get("code") ?? ""));
    if (!code.success) return { ok: false, message: "6 оронтой кодоо оруулна уу." };
    const auth = await getAuth();
    try {
      await auth.api.verifyTOTP({ body: { code: code.data }, headers: await headers() });
    } catch (err) {
      if (err instanceof APIError)
        return { ok: false, message: "Код буруу байна. Апп дээрх шинэ кодыг оруулна уу." };
      throw err;
    }
    await logActivity(me, "profile.two_factor_enable", {
      type: "user",
      id: me.id,
      summary: "2 шатлалт баталгаажуулалтыг идэвхжүүлэв",
    });
  } catch (err) {
    return actionError(err);
  }
  // The setup screen is replaced by the "manage" screen once enabled, so confirm on the profile.
  redirect("/admin/profile?twoFactor=on");
}

export async function disableTwoFactor(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const me = await requireSession();
    const auth = await getAuth();
    try {
      await auth.api.disableTwoFactor({
        body: { password: String(data.get("password") ?? "") },
        headers: await headers(),
      });
    } catch (err) {
      if (err instanceof APIError) return { ok: false, message: WRONG_PASSWORD };
      throw err;
    }
    await logActivity(me, "profile.two_factor_disable", {
      type: "user",
      id: me.id,
      summary: "2 шатлалт баталгаажуулалтыг унтраав",
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "2 шатлалт баталгаажуулалт унтарлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export type BackupCodesState = ActionState & { backupCodes?: string[] };

export async function regenerateBackupCodes(
  _prev: BackupCodesState,
  data: FormData,
): Promise<BackupCodesState> {
  try {
    const me = await requireSession();
    const auth = await getAuth();
    try {
      const res = await auth.api.generateBackupCodes({
        body: { password: String(data.get("password") ?? "") },
        headers: await headers(),
      });
      await logActivity(me, "profile.backup_codes", {
        type: "user",
        id: me.id,
        summary: "Нөөц кодуудыг шинээр үүсгэв",
      });
      return {
        ok: true,
        message: "Шинэ нөөц кодууд. Хуучин кодууд хүчингүй боллоо.",
        backupCodes: res.backupCodes,
      };
    } catch (err) {
      if (err instanceof APIError) return { ok: false, message: WRONG_PASSWORD };
      throw err;
    }
  } catch (err) {
    return actionError(err);
  }
}
