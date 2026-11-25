import "@/lib/validation/zod-config";
import { z } from "zod";
import { normalizeClass } from "@/lib/recruitment/logic";
import { classNameRegex } from "@/lib/validation/forms";

/**
 * "Миний мэдээлэл": a person's own last name, first name and class (also edited by admins in
 * Админ → Хэрэглэгчид). Pure: the same rules run in the browser and on the server.
 * Error messages are i18n keys under `Me.profile.errors.*`.
 */

export const NAME_MAX = 40;

/** Cyrillic or Latin letters, spaces, "-" and "." (Ө and Ү are Cyrillic). */
const NAME_CHARS =
  /^[\p{Script=Cyrillic}\p{Script=Latin}][\p{Script=Cyrillic}\p{Script=Latin} .-]*$/u;

/** Trims and collapses inner spaces. */
export const cleanName = (v: string) => v.trim().replace(/\s+/g, " ");

const namePart = z
  .string({ error: "required" })
  .transform(cleanName)
  .pipe(
    z
      .string()
      .min(1, { error: "required" })
      .max(NAME_MAX, { error: "tooLong" })
      .regex(NAME_CHARS, { error: "nameChars" }),
  );

/**
 * Schema for one person. `classRequired`: applicants and members must give a class, admins
 * may leave it empty. `classes`: the open enrollment's class list (same as the join form); when
 * empty, the free form "10А", "9 б" is accepted.
 */
export function buildProfileSchema({
  classRequired,
  classes,
}: {
  classRequired: boolean;
  classes: readonly string[];
}) {
  return z.object({
    lastName: namePart,
    firstName: namePart,
    className: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v !== "" || !classRequired, { error: "required" })
      .refine(
        (v) =>
          v === "" ||
          (classes.length > 0 ? classes.includes(normalizeClass(v)) : classNameRegex.test(v)),
        { error: "className" },
      )
      .transform((v) => (v === "" ? "" : normalizeClass(v))),
  });
}

export type Profile = z.output<ReturnType<typeof buildProfileSchema>>;

/** Display name, Mongolian order: "Овог Нэр" (the same rule for Clerk names and own edits). */
export function displayName(firstName: string, lastName: string) {
  return [lastName, firstName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

/** Class is required for applicants and members, optional for admins. */
export const classRequiredFor = (role: string | null) => role !== "admin";
