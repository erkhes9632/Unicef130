"use server";

import { and, count, eq, gt, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, contactMessages } from "@/db/schema";
import { runInBackground, syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { getSiteSettings } from "@/lib/data/settings";
import { notifyNewApplication, notifyNewContactMessage } from "@/lib/integrations/notifications";
import { verifyTurnstile } from "@/lib/integrations/turnstile";
import { consumeRateLimit } from "@/lib/rate-limit";
import { countTaken, isBlocked, listPeriods } from "@/lib/recruitment/data";
import { formAgeMs, hashIp } from "@/lib/recruitment/form-token";
import {
  findOpenPeriod,
  generateTrackingCode,
  intakeFor,
  MIN_FILL_MS,
  normalizeClass,
  normalizeMnPhone,
  SPAM_THRESHOLD,
  spamScore,
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
  | { ok: true; trackingCode: string | null; waitlisted: boolean }
  | {
      ok: false;
      error:
        | "validation"
        | "captcha"
        | "unavailable"
        | "server"
        | "closed"
        | "full"
        | "duplicate"
        | "rate"
        | "tooFast"
        | "stale";
      fieldErrors?: Record<string, string[] | undefined>;
    };

const token = { turnstileToken: z.string().max(2048).optional() };
const contactServerSchema = contactFormSchema.extend(token);
/** Fields the browser adds around the visible form. */
const joinMetaSchema = z.object({
  turnstileToken: z.string().max(2048).optional(),
  /** Honeypot: hidden from people, tempting for scripts. Must stay empty. */
  website: z.string().max(200).optional(),
  formToken: z.string().max(120).optional(),
});

async function clientIp() {
  return (await headers()).get("cf-connecting-ip");
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Error && /UNIQUE constraint failed/i.test(`${err.message} ${String(err.cause)}`);

/**
 * Join form. Layers, cheapest first: honeypot → signed form age (min fill time) → Turnstile →
 * open period → strict validation against the period → blocks → duplicate phone → per-address
 * rate limits → capacity → spam score → store. Google Sheets + notifications run in the
 * background and never fail the submission.
 */
export async function submitJoinApplication(input: unknown): Promise<JoinActionResult> {
  const meta = joinMetaSchema.safeParse(input);
  if (!meta.success) return { ok: false, error: "validation" };
  // A filled honeypot is a script: answer like a success, store nothing.
  if (meta.data.website) return { ok: true, trackingCode: null, waitlisted: false };

  const fillMs = await formAgeMs(meta.data.formToken);
  if (fillMs === null) return { ok: false, error: "stale" };
  if (fillMs < MIN_FILL_MS) return { ok: false, error: "tooFast" };

  const ip = await clientIp();
  const check = await verifyTurnstile(meta.data.turnstileToken, ip);
  if (check !== "ok")
    return { ok: false, error: check === "unavailable" ? "unavailable" : "captcha" };

  try {
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

    const phone = normalizeMnPhone(d.phone)!;
    const ipHash = await hashIp(ip);
    // Blocked senders get the same answer as a rate limit (no hint that a block exists).
    if (await isBlocked(phone, ipHash)) return { ok: false, error: "rate" };

    const db = await getDb();
    const [existing] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.periodId, period.id), eq(applications.phoneNormalized, phone)))
      .limit(1);
    if (existing) return { ok: false, error: "duplicate" };

    const tenMinutes = await consumeRateLimit(
      `join:10m:${ipHash}`,
      period.ipLimitPer10Min,
      10 * 60 * 1000,
    );
    const day = await consumeRateLimit(
      `join:day:${ipHash}`,
      period.ipLimitPerDay,
      24 * 60 * 60 * 1000,
    );
    if (!tenMinutes.allowed || !day.allowed) return { ok: false, error: "rate" };

    const intake = intakeFor(period, period.capacity === null ? 0 : await countTaken(period.id));
    if (intake === "full") return { ok: false, error: "full" };

    const [[sameReason], [sameIp]] = await Promise.all([
      db
        .select({ n: count() })
        .from(applications)
        .where(and(eq(applications.periodId, period.id), eq(applications.reason, d.reason))),
      db
        .select({ n: count() })
        .from(applications)
        .where(
          and(
            eq(applications.ipHash, ipHash),
            gt(applications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
            ne(applications.status, "spam"),
          ),
        ),
    ]);
    const spam = spamScore({
      fillMs,
      fullName: d.fullName,
      reason: d.reason,
      sameReasonCount: sameReason?.n ?? 0,
      sameIpRecent: sameIp?.n ?? 0,
    });
    const suspicious = spam.score >= SPAM_THRESHOLD;
    const status = suspicious ? "spam" : intake === "waitlist" ? "waitlist" : "new";

    // Tracking codes are short: retry on the rare collision.
    for (let attempt = 0; attempt < 6; attempt++) {
      const trackingCode = generateTrackingCode();
      try {
        const [row] = await db
          .insert(applications)
          .values({
            fullName: d.fullName,
            className: normalizeClass(d.className),
            phone: `+976${phone}`,
            phoneNormalized: phone,
            email: d.email || null,
            reason: d.reason,
            helpWith: [...new Set(d.helpWith)],
            answers: d.answers,
            consentAt: new Date(),
            periodId: period.id,
            trackingCode,
            ipHash,
            spamScore: spam.score,
            spamFlags: spam.flags,
            status,
          })
          .returning({ id: applications.id, createdAt: applications.createdAt });
        if (!suspicious) {
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
        }
        // Suspicious applications look accepted to the sender; an admin reviews them.
        return { ok: true, trackingCode, waitlisted: status === "waitlist" };
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        if (/phone_normalized/.test(`${(err as Error).message} ${String((err as Error).cause)}`))
          return { ok: false, error: "duplicate" };
        // otherwise: tracking code collision → try another code
      }
    }
    throw new Error("could not allocate a tracking code");
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
