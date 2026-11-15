import "@/lib/validation/zod-config";
import { z } from "zod";

/** One password policy for every place a password is chosen (invite, reset, profile, script). */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { error: `Нууц үг дор хаяж ${MIN_PASSWORD_LENGTH} тэмдэгт байна.` })
  .max(MAX_PASSWORD_LENGTH, { error: "Нууц үг хэт урт байна." });

export const newPasswordSchema = z
  .object({ password: passwordSchema, repeat: z.string() })
  .refine((v) => v.password === v.repeat, {
    path: ["repeat"],
    error: "Нууц үг хоёр удаа ижил байх ёстой.",
  });
