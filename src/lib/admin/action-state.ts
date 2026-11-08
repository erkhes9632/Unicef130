import { z } from "zod";
import { AuthError } from "@/lib/auth/session";

/** Result shape shared by all admin Server Actions (used with useActionState). */
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: "Маягтын алдааг засна уу.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

/** Maps thrown errors to a user-facing state. Re-throws Next.js redirect/notFound signals. */
export function actionError(err: unknown): ActionState {
  if (err instanceof AuthError) {
    return {
      ok: false,
      message:
        err.code === "forbidden" ? "Танд энэ үйлдлийг хийх эрх байхгүй." : "Дахин нэвтэрнэ үү.",
    };
  }
  if (isNextSignal(err)) throw err;
  console.error("[admin action]", err);
  return { ok: false, message: "Алдаа гарлаа. Дахин оролдоно уу." };
}

function isNextSignal(err: unknown) {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR"))
  );
}

// ---- FormData helpers ------------------------------------------------------

export const fd = {
  str(data: FormData, key: string) {
    const v = data.get(key);
    return typeof v === "string" ? v.trim() : "";
  },
  /** Empty string → null */
  opt(data: FormData, key: string) {
    const v = fd.str(data, key);
    return v === "" ? null : v;
  },
  bool(data: FormData, key: string) {
    const v = data.get(key);
    return v === "on" || v === "true" || v === "1";
  },
  int(data: FormData, key: string, fallback = 0) {
    const n = Number.parseInt(fd.str(data, key), 10);
    return Number.isFinite(n) ? n : fallback;
  },
  json(data: FormData, key: string): unknown {
    const v = fd.str(data, key);
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  },
};
