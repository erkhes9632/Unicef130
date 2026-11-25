"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { runInBackground, syncApplicationToSheets } from "@/lib/applications/sheets-sync";
import { AuthError, assertSignedIn } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/lib/rate-limit";
import { countTaken, listPeriods } from "@/lib/recruitment/data";
import {
  findOpenPeriod,
  intakeFor,
  normalizeClass,
  normalizeMnPhone,
} from "@/lib/recruitment/logic";
import { buildJoinSchema } from "@/lib/validation/forms";

type JoinActionResult =
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

const isUniqueViolation = (err: unknown) =>
  err instanceof Error && /UNIQUE constraint failed/i.test(`${err.message} ${String(err.cause)}`);

/** Submits per account: at most 5 tries in 10 minutes (typos, validation errors). */
const JOIN_SUBMITS_PER_10_MIN = 5;

/**
 * Join form (signed-in accounts only; Clerk's bot protection covers sign-up). Order: account
 * checks → per-account rate limit → open period → strict validation against the period → one
 * application per account per period → capacity / waitlist → store. The Google Sheets copy
 * runs in the background and never fails the submission.
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
        .returning({ id: applications.id });
      await runInBackground(syncApplicationToSheets(row!.id));
    } catch (err) {
      // Two tabs submitting at once: the unique (account, period) index keeps one.
      if (isUniqueViolation(err)) return { ok: false, error: "duplicate" };
      throw err;
    }
    return { ok: true, waitlisted: status === "waitlist" };
  } catch (err) {
    logger.error("join", "failed to store application", err);
    return { ok: false, error: "server" };
  }
}
