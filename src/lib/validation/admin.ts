import { z } from "zod";
import { SLUG_MAX, slugRegex } from "@/lib/slug";
import { newsCategories } from "@/lib/types";
import { richTextSchema } from "./rich-text";

/** Admin-side schemas (Mongolian error messages; admin UI is Mongolian only). */

const req = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: "Заавал бөглөнө." })
    .max(max, { error: `Хамгийн ихдээ ${max} тэмдэгт.` });
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Хамгийн ихдээ ${max} тэмдэгт.` })
    .transform((v) => (v === "" ? null : v))
    .nullable();

const slug = z
  .string()
  .trim()
  .max(SLUG_MAX, { error: `Хамгийн ихдээ ${SLUG_MAX} тэмдэгт.` })
  .refine((v) => v === "" || slugRegex.test(v), {
    error: "Зөвхөн жижиг латин үсэг, тоо, зураас (-) ашиглана.",
  });

/** Relative path (/media/..., /placeholders/...) or https URL. */
export const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"),
    {
      error: "Зургийн хаяг буруу байна.",
    },
  )
  .transform((v) => (v === "" ? null : v))
  .nullable();

const date = z.date({ error: "Огноо буруу байна." });

export const newsInputSchema = z.object({
  title: req(200),
  titleEn: opt(200),
  slug,
  excerpt: req(400),
  excerptEn: opt(400),
  category: z.enum(newsCategories, { error: "Ангилал сонгоно уу." }),
  tags: z.array(z.string().trim().min(1).max(40)).max(10, { error: "Хамгийн ихдээ 10 шошго." }),
  coverUrl: imageUrl,
  content: richTextSchema,
  contentEn: richTextSchema.nullable(),
  status: z.enum(["draft", "published"]),
  publishedAt: date.nullable(),
});
export type NewsInput = z.output<typeof newsInputSchema>;

export const eventInputSchema = z
  .object({
    title: req(200),
    titleEn: opt(200),
    slug,
    summary: req(400),
    summaryEn: opt(400),
    location: req(200),
    locationEn: opt(200),
    coverUrl: imageUrl,
    startsAt: date,
    endsAt: date.nullable(),
    content: richTextSchema,
    contentEn: richTextSchema.nullable(),
    published: z.boolean(),
  })
  .refine((e) => !e.endsAt || e.endsAt >= e.startsAt, {
    path: ["endsAt"],
    error: "Дуусах цаг эхлэх цагаас хойш байх ёстой.",
  });
export type EventInput = z.output<typeof eventInputSchema>;

export const memberInputSchema = z.object({
  name: req(100),
  nameEn: opt(100),
  role: req(100),
  roleEn: opt(100),
  className: req(20),
  group: z.enum(["leadership", "member"]),
  sortOrder: z.number().int().min(0).max(10_000),
  photoUrl: imageUrl,
  showPhoto: z.boolean(),
  active: z.boolean(),
});
export type MemberInput = z.output<typeof memberInputSchema>;

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), {
    error: "https:// -ээр эхэлсэн хаяг оруулна уу.",
  });

export const settingsInputSchema = z.object({
  contact: z.object({
    address: z.string().trim().max(300),
    addressEn: z.string().trim().max(300),
    email: z.union([z.literal(""), z.email({ error: "И-мэйл буруу." })]),
    phone: z.string().trim().max(40),
    officeHours: z.string().trim().max(120),
    officeHoursEn: z.string().trim().max(120),
    mapEmbedUrl: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === "" || v.startsWith("https://www.google.com/maps/embed"), {
        error:
          "Google Maps → Share → Embed a map хэсгээс авсан хаягийг (https://www.google.com/maps/embed...) оруулна уу.",
      }),
  }),
  socials: z.array(
    z.object({
      platform: z.enum(["facebook", "instagram", "youtube", "tiktok", "telegram", "x"]),
      url: httpsUrl,
    }),
  ),
  stats: z.object({
    members: z.number().int().min(0).max(1_000_000),
    events: z.number().int().min(0).max(1_000_000),
    volunteerHours: z.number().int().min(0).max(10_000_000),
    childrenHelped: z.number().int().min(0).max(10_000_000),
  }),
  donationUrl: httpsUrl,
});
export type SettingsInput = z.output<typeof settingsInputSchema>;

export const passwordSchema = z
  .string()
  .min(10, { error: "Нууц үг дор хаяж 10 тэмдэгт." })
  .max(128, { error: "Нууц үг хэт урт." });

export const userCreateSchema = z.object({
  name: req(100),
  email: z.email({ error: "И-мэйл буруу." }).max(254),
  role: z.enum(["admin", "editor"]),
  password: z.union([z.literal(""), passwordSchema]),
});

export const albumInputSchema = z.object({
  title: req(200),
  titleEn: opt(200),
  slug,
  description: z.string().trim().max(1000, { error: "Хамгийн ихдээ 1000 тэмдэгт." }),
  descriptionEn: opt(1000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Огноо буруу байна." }),
  published: z.boolean(),
});

export const albumImagesSchema = z
  .array(
    z.object({
      url: z.string().max(300),
      thumbUrl: z.string().max(300),
      width: z.number().int().min(1).max(10_000),
      height: z.number().int().min(1).max(10_000),
      alt: z.string().trim().max(200),
    }),
  )
  .min(1)
  .max(50);
