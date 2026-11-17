import "./zod-config";
import { z } from "zod";
import {
  containsUrl,
  isCyrillicFullName,
  normalizeClass,
  normalizeMnPhone,
} from "@/lib/recruitment/logic";

/**
 * Shared schemas for public forms (client + server). Error messages are i18n keys under
 * `Forms.errors.*` so the client can translate them.
 * Users are mostly minors: collect only what the club needs.
 */

/** Help-option keys; the list itself is editable in admin (see src/lib/settings/types.ts). */
const helpOptionKey = z.string().regex(/^[a-z0-9-]{1,40}$/, { error: "helpWith" });

const trimmed = (min: number, max: number) =>
  z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .min(min, { error: "tooShort" })
    .max(max, { error: "tooLong" });

// "10А", "10 а", "9-Б", "11A" — used only when a period has no class list.
export const classNameRegex = /^\d{1,2}\s*-?\s*\p{L}{0,2}$/u;

/** Shape of a period's custom question as the form needs it (labels already localized). */
type JoinQuestion = {
  id: string;
  type: "text" | "choice" | "checkbox";
  options: string[];
  required: boolean;
};

/**
 * Join form schema for one recruitment period. The same schema runs in the browser and again on
 * the server (which also checks the account, help options, duplicates and the rate limit). The
 * e-mail address comes from the signed-in account, so the form doesn't ask for it.
 * Error messages are i18n keys under `Forms.errors.*`.
 */
export function buildJoinSchema({
  classes,
  questions,
}: {
  classes: readonly string[];
  questions: readonly JoinQuestion[];
}) {
  return z
    .object({
      fullName: z
        .string({ error: "required" })
        .trim()
        .min(1, { error: "required" })
        .refine(isCyrillicFullName, { error: "nameCyrillic" }),
      className: z
        .string({ error: "required" })
        .trim()
        .min(1, { error: "required" })
        .refine(
          (v) =>
            classes.length > 0 ? classes.includes(normalizeClass(v)) : classNameRegex.test(v),
          { error: "className" },
        ),
      phone: z
        .string({ error: "required" })
        .trim()
        .min(1, { error: "required" })
        .refine((v) => normalizeMnPhone(v) !== null, { error: "phone" }),
      reason: trimmed(10, 1000).refine((v) => !containsUrl(v), { error: "noLinks" }),
      helpWith: z.array(helpOptionKey).min(1, { error: "helpWith" }).max(20, { error: "helpWith" }),
      answers: z.record(z.string(), z.union([z.string().max(500), z.boolean()])),
      consent: z.literal(true, { error: "consent" }),
    })
    .superRefine((value, ctx) => {
      for (const q of questions) {
        const answer = value.answers[q.id];
        const fail = (message: string) =>
          ctx.addIssue({ code: "custom", path: ["answers", q.id], message });
        if (q.type === "checkbox") {
          if (q.required && answer !== true) fail("required");
          continue;
        }
        const text = typeof answer === "string" ? answer.trim() : "";
        if (!text) {
          if (q.required) fail("required");
          continue;
        }
        if (q.type === "choice" && !q.options.includes(text)) fail("required");
        if (q.type === "text" && containsUrl(text)) fail("noLinks");
      }
    });
}
export type JoinFormValues = z.input<ReturnType<typeof buildJoinSchema>>;

export const contactFormSchema = z.object({
  name: trimmed(2, 100),
  email: z
    .string()
    .trim()
    .min(1, { error: "required" })
    .max(254, { error: "tooLong" })
    .pipe(z.email({ error: "email" })),
  subject: z.string().trim().max(150, { error: "tooLong" }),
  message: trimmed(10, 2000),
});
export type ContactFormValues = z.input<typeof contactFormSchema>;
