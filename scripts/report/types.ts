/**
 * Shapes of the private files written by parse-docx.ts and read by build-import.ts:
 * private/report-<year>.json and private/report-media/manifest.json.
 */
import { z } from "zod";

const pillar = z.enum(["advocacy", "education", "fundraising"]);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportSchema = z.object({
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  contentVersion: ymd,
  source: z.object({ file: z.string(), sha256: z.string() }),
  club: z.object({
    school: z.string(),
    schoolEn: z.string(),
    name: z.string(),
    nameEn: z.string(),
    foundedYear: z.number().int(),
  }),
  /** Private: imported with show_publicly = 0. No phone numbers. */
  leaders: z.array(z.object({ role: z.string(), roleEn: z.string(), name: z.string() })),
  membership: z.object({
    totalJoined: z.number().int(),
    active: z.number().int(),
    /** Sum of the active members' hours (checked against the report's 734). */
    hours: z.number().int(),
  }),
  /** Private: names and hours never appear on public pages. */
  activeMembers: z.array(
    z.object({
      n: z.number().int(),
      /** Cyrillic spelling when it clearly matches the previous import, else the .docx Latin. */
      name: z.string(),
      /** As written in the .docx (Latin). */
      nameEn: z.string(),
      hours: z.number().int().min(0),
    }),
  ),
  organisations: z.array(
    z.object({
      name: z.string(),
      nameEn: z.string(),
      type: z.enum(["partner", "beneficiary"]),
    }),
  ),
  activities: z.array(
    z.object({
      n: z.number().int(),
      pillar,
      slug: z.string(),
      title: z.string(),
      titleEn: z.string(),
      start: ymd,
      end: ymd.nullable(),
      text: z.string(),
      textEn: z.string(),
      inPerson: z.object({
        value: z.number().int().nullable(),
        approx: z.boolean(),
        atLeast: z.boolean(),
        /** Display form: "≈500", "50+", "1,000", "Сургуулийн хүрээлэл" */
        label: z.string(),
        labelEn: z.string(),
      }),
      online: z.number().int(),
      raised: z.number().int().nullable(),
      sdgs: z.array(z.number().int().min(1).max(17)),
      partners: z.array(z.string()),
      beneficiaries: z.array(z.string()),
      location: z.string(),
      locationEn: z.string(),
      note: z.string(),
    }),
  ),
  totals: z.array(
    z.object({
      pillar: z.enum(["advocacy", "education", "fundraising", "total"]),
      activities: z.number().int(),
      inPerson: z.number().int(),
      inPersonLabel: z.string(),
      online: z.number().int(),
      total: z.number().int(),
      raised: z.number().int(),
    }),
  ),
  /** Differences between the report's parts, for the admin notes and the developer. */
  discrepancies: z.array(z.string()),
});
export type Report = z.infer<typeof reportSchema>;

export const manifestSchema = z.object({
  source: z.string(),
  images: z.array(
    z.object({
      file: z.string(),
      sha256: z.string(),
      width: z.number().int(),
      height: z.number().int(),
      /** Where the image sits in the document. */
      where: z.string(),
      activity: z.number().int().nullable(),
      /** Order within the activity (1-based, after duplicates are dropped). */
      order: z.number().int().nullable(),
      duplicateOf: z.string().nullable(),
      keep: z.boolean(),
      reason: z.string(),
      alt: z.string(),
      altEn: z.string(),
      original: z.string().nullable(),
      output: z
        .object({
          key: z.string(),
          thumbKey: z.string(),
          file: z.string(),
          thumbFile: z.string(),
          width: z.number().int(),
          height: z.number().int(),
          thumbWidth: z.number().int(),
          thumbHeight: z.number().int(),
          md5: z.string(),
          thumbMd5: z.string(),
          /** 960 px variant (srcset). */
          mediumKey: z.string(),
          mediumFile: z.string(),
          mediumMd5: z.string(),
        })
        .nullable(),
    }),
  ),
});
export type Manifest = z.infer<typeof manifestSchema>;

/** private/member-names-<year>.json: spellings from the previous import (private). */
export const knownNamesSchema = z.object({
  source: z.string(),
  members: z.array(
    z.object({
      n: z.number().int(),
      mn: z.string(),
      /** Previous import's short Latin form, e.g. "B. Bat-Erdene" (family initial + given name). */
      nameEn: z.string(),
      hours: z.number().int(),
      /** Spelling was already marked uncertain. */
      review: z.boolean(),
    }),
  ),
});
export type KnownName = z.infer<typeof knownNamesSchema>["members"][number];
