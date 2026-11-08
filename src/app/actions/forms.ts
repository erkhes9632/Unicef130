"use server";

import { z } from "zod";
import { contactFormSchema, joinFormSchema } from "@/lib/validation/forms";

export type FormActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "captcha" | "server";
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Join form submission. Input is validated again on the server.
 * Phase 6 adds: Turnstile verification, D1 storage, Google Sheets sync, notification hook.
 */
export async function submitJoinApplication(input: unknown): Promise<FormActionResult> {
  const parsed = joinFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  console.info("[join] valid application received (storage arrives in Phase 6)");
  return { ok: true };
}

/** Contact form submission. Phase 6 adds Turnstile + D1 storage. */
export async function submitContactMessage(input: unknown): Promise<FormActionResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  console.info("[contact] valid message received (storage arrives in Phase 6)");
  return { ok: true };
}
