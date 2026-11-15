"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, contactMessages } from "@/db/schema";
import { runInBackground, syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { AuthError, assertSignedIn } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { notifyNewApplication, notifyNewContactMessage } from "@/lib/integrations/notifications";
import { verifyTurnstile } from "@/lib/integrations/turnstile";
import { consumeRateLimit, hashIp } from "@/lib/rate-limit";
import { countTaken, listPeriods } from "@/lib/recruitment/data";
import {
  findOpenPeriod,
  intakeFor,
  normalizeClass,
  normalizeMnPhone,
} from "@/lib/recruitment/logic";
import { buildJoinSchema, contactFormSchema } from "@/lib/validation/forms";

export type FormActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "captcha" | "unavailable" | "rate" | "server";
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type JoinActionResult =
  | { ok: true; waitlisted: boolean }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "member"
        | "blocked"
        | "server"
        | "closed"
        | "full"
        | "duplicate"
        | "rate";
      fieldErrors?: Record<string, string[] | undefined>;
    };

const contactServerSchema = contactFormSchema.extend({
  turnstileToken: z.string().max(2048).optional(),
});

async function clientIp() {
  return (await headers()).get("cf-connecting-ip");
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Error && /UNIQUE constraint failed/i.test(`${err.message} ${String(err.cause)}`);

/** Submits per account: at most 5 tries in 10 minutes (typos, validation errors). */
const JOIN_SUBMITS_PER_10_MIN = 5;

/**
 * Join form (signed-in accounts only; Clerk's bot protection covers sign-up). Order: account
 * checks → per-account rate limit → open period → strict validation against the period → one
 * application per account per period → capacity / waitlist → store. Google Sheets and
 * notifications run in the background and never fail the submission.
 */
export async function submitJoinApplication(input: unknown): Promise<JoinActionResult> {
  let me;
  try {
    me = await assertSignedIn();
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "unauthenticated" };
    throw err;
  }
  if (me.role) return { ok: false, error: "member" };
  if (me.applyBlocked) return { ok: false, error: "blocked" };

  try {
    const limit = await consumeRateLimit(
      `join:user:${me.id}`,
      JOIN_SUBMITS_PER_10_MIN,
      10 * 60 * 1000,
    );
    if (!limit.allowed) return { ok: false, error: "rate" };

    const period = findOpenPeriod(await listPeriods());
    if (!period) return { ok: false, error: "closed" };

    const schema = buildJoinSchema({
      classes: period.classes.map(normalizeClass),
      questions: period.questions.map((q) => ({
        id: q.id,
        type: q.type,
        // A choice may be submitted in either language.
        options: q.options.flatMap((o) => [o.label, o.labelEn].filter(Boolean)),
        required: q.required,
      })),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "validation",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }
    const d = parsed.data;
    const { helpOptions } = await getSiteSettings();
    const allowed = new Set(helpOptions.map((o) => o.key));
    if (!d.helpWith.every((h) => allowed.has(h))) {
      return { ok: false, error: "validation", fieldErrors: { helpWith: ["helpWith"] } };
    }

    const db = await getDb();
    const [existing] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.userId, me.id), eq(applications.periodId, period.id)))
      .limit(1);
    if (existing) return { ok: false, error: "duplicate" };

    const intake = intakeFor(period, period.capacity === null ? 0 : await countTaken(period.id));
    if (intake === "full") return { ok: false, error: "full" };
    const status = intake === "waitlist" ? "waitlist" : "new";

    try {
      const [row] = await db
        .insert(applications)
        .values({
          userId: me.id,
          periodId: period.id,
          fullName: d.fullName,
          className: normalizeClass(d.className),
          phone: `+976${normalizeMnPhone(d.phone)!}`,
          email: me.email || null,
          reason: d.reason,
          helpWith: [...new Set(d.helpWith)],
          answers: d.answers,
          consentAt: new Date(),
          status,
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
    } catch (err) {
      // Two tabs submitting at once: the unique (account, period) index keeps one.
      if (isUniqueViolation(err)) return { ok: false, error: "duplicate" };
      throw err;
    }
    return { ok: true, waitlisted: status === "waitlist" };
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
  const check = await verifyTurnstile(parsed.data.turnstileToken, await clientIp());
  if (check !== "ok")
    return { ok: false, error: check === "unavailable" ? "unavailable" : "captcha" };
  const { name, email, subject, message } = parsed.data;
  try {
    // At most 3 messages per network address in 10 minutes.
    const limit = await consumeRateLimit(
      `contact:${await hashIp(await clientIp())}`,
      3,
      10 * 60 * 1000,
    );
    if (!limit.allowed) return { ok: false, error: "rate" };
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
