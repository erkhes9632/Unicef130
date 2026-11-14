"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, contactMessages } from "@/db/schema";
import { runInBackground, syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { notifyNewApplication, notifyNewContactMessage } from "@/lib/integrations/notifications";
import { getSiteSettings } from "@/lib/data/settings";
import { verifyTurnstile } from "@/lib/integrations/turnstile";
import {
  contactFormSchema,
  joinFormSchema,
  normalizeClassName,
  normalizePhone,
} from "@/lib/validation/forms";

export type FormActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "captcha" | "server";
      fieldErrors?: Record<string, string[] | undefined>;
    };

const token = { turnstileToken: z.string().max(2048).optional() };
const joinServerSchema = joinFormSchema.extend(token);
const contactServerSchema = contactFormSchema.extend(token);

async function clientIp() {
  return (await headers()).get("cf-connecting-ip");
}

/**
 * Join form: validate again on the server → Turnstile → D1 → (background) Google Sheets + notify.
 * The Sheets sync never blocks or fails the submission.
 */
export async function submitJoinApplication(input: unknown): Promise<FormActionResult> {
  const parsed = joinServerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  if (!(await verifyTurnstile(parsed.data.turnstileToken, await clientIp()))) {
    return { ok: false, error: "captcha" };
  }
  // Only options currently offered in admin settings are accepted.
  const { helpOptions } = await getSiteSettings();
  const allowed = new Set(helpOptions.map((o) => o.key));
  if (!parsed.data.helpWith.every((h) => allowed.has(h))) {
    return { ok: false, error: "validation", fieldErrors: { helpWith: ["helpWith"] } };
  }
  const d = { ...parsed.data, helpWith: [...new Set(parsed.data.helpWith)] };
  try {
    const db = await getDb();
    const [row] = await db
      .insert(applications)
      .values({
        fullName: d.fullName,
        className: normalizeClassName(d.className),
        phone: normalizePhone(d.phone),
        email: d.email || null,
        reason: d.reason,
        helpWith: d.helpWith,
        consentAt: new Date(),
      })
      .returning({ id: applications.id, createdAt: applications.createdAt });
    await runInBackground(
      Promise.allSettled([
        syncApplicationToSheets(row!.id),
        notifyNewApplication({
          id: row!.id,
          fullName: d.fullName,
          className: d.className,
          createdAt: row!.createdAt,
        }),
      ]),
    );
    return { ok: true };
  } catch (err) {
    console.error("[join] failed to store application", err);
    return { ok: false, error: "server" };
  }
}

/** Contact form: validate → Turnstile → D1 → (background) notify. */
export async function submitContactMessage(input: unknown): Promise<FormActionResult> {
  const parsed = contactServerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  if (!(await verifyTurnstile(parsed.data.turnstileToken, await clientIp()))) {
    return { ok: false, error: "captcha" };
  }
  const { name, email, subject, message } = parsed.data;
  try {
    const db = await getDb();
    const [row] = await db
      .insert(contactMessages)
      .values({ name, email: email.toLowerCase(), subject, message })
      .returning({ id: contactMessages.id });
    await runInBackground(notifyNewContactMessage({ id: row!.id, name, email, subject }));
    return { ok: true };
  } catch (err) {
    console.error("[contact] failed to store message", err);
    return { ok: false, error: "server" };
  }
}
