import { z } from "zod";

/**
 * Shared schemas for public forms (client + server). Error messages are i18n keys under
 * `Forms.errors.*` so the client can translate them.
 * Users are mostly minors: collect only what the club needs.
 */

export const helpOptions = ["events", "reading", "charity", "media", "design", "other"] as const;
export type HelpOption = (typeof helpOptions)[number];

const trimmed = (min: number, max: number) =>
  z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .min(min, { error: "tooShort" })
    .max(max, { error: "tooLong" });

// "10А", "10 а", "9-Б", "11A"
export const classNameRegex = /^\d{1,2}\s*-?\s*\p{L}{0,2}$/u;
// Mongolian numbers: 8 digits, optional +976 prefix, optional space/dash in the middle.
export const phoneRegex = /^(\+?976[\s-]?)?\d{4}[\s-]?\d{4}$/;

export const joinFormSchema = z.object({
  fullName: trimmed(2, 100),
  className: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .regex(classNameRegex, { error: "className" }),
  phone: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .regex(phoneRegex, { error: "phone" }),
  email: z
    .string()
    .trim()
    .max(254, { error: "tooLong" })
    .refine((v) => v === "" || z.email().safeParse(v).success, { error: "email" }),
  reason: trimmed(10, 1000),
  helpWith: z.array(z.enum(helpOptions)).min(1, { error: "helpWith" }).max(helpOptions.length),
  consent: z.literal(true, { error: "consent" }),
});
export type JoinFormValues = z.input<typeof joinFormSchema>;
export type JoinFormData = z.output<typeof joinFormSchema>;

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
export type ContactFormData = z.output<typeof contactFormSchema>;

/** Normalizes a phone number to "+976XXXXXXXX" for storage. */
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `+976${digits.slice(-8)}`;
}

/** Normalizes a class name: "10 а" → "10А". */
export function normalizeClassName(value: string) {
  return value.replace(/[\s-]/g, "").toLocaleUpperCase("mn");
}
