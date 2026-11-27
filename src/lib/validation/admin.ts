import "@/lib/validation/zod-config";
import { z } from "zod";
import { isSchoolYear } from "@/lib/school-year";
import {
  MAX_FEATURED_STATS,
  instagramHandle,
  partnerTypes,
  socialPlatforms,
  statKinds,
} from "@/lib/settings/types";
import { SLUG_MAX, slugRegex } from "@/lib/slug";
import { clubDirections, newsCategories } from "@/lib/types";
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

/** Relative path (/media/..., /brand/...) or https URL. */
const imageUrl = z
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

const sdgList = z.array(z.number().int().min(1).max(17)).max(17);

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
  sdgs: sdgList,
  featured: z.boolean(),
  metaTitle: z.string().trim().max(70, { error: "Хамгийн ихдээ 70 тэмдэгт." }),
  metaDescription: z.string().trim().max(160, { error: "Хамгийн ихдээ 160 тэмдэгт." }),
  albumId: z.string().max(64).nullable(),
});

export const eventInputSchema = z
  .object({
    title: req(200),
    titleEn: opt(200),
    slug,
    summary: req(400),
    summaryEn: opt(400),
    location: z.string().trim().max(200, { error: "Хамгийн ихдээ 200 тэмдэгт." }),
    locationEn: opt(200),
    coverUrl: imageUrl,
    startsAt: date,
    endsAt: date.nullable(),
    content: richTextSchema,
    contentEn: richTextSchema.nullable(),
    published: z.boolean(),
    allDay: z.boolean(),
    // Activity report fields (optional)
    direction: z.enum(clubDirections).nullable(),
    schoolYear: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{4}$/.test(v), {
        error: "Хичээлийн жилийг 2025-2026 хэлбэрээр бичнэ.",
      })
      .transform((v) => v || null),
    reachInPerson: opt(40),
    reachInPersonEn: opt(40),
    reachOnline: z.number().int().min(0).max(100_000_000).nullable(),
    donationAmount: z.number().int().min(0).max(10_000_000_000).nullable(),
    partners: z.array(z.string().trim().min(1).max(120)).max(10),
    beneficiaries: z.array(z.string().trim().min(1).max(120)).max(10),
    sdgs: sdgList,
    adminNote: z.string().trim().max(2000),
    // Volunteer sign-up for members (/me)
    signupEnabled: z.boolean(),
    signupCapacity: z
      .number({ error: "Орон тоо: бүхэл тоо." })
      .int({ error: "Орон тоо: бүхэл тоо." })
      .min(1, { error: "Орон тоо дор хаяж 1." })
      .max(10_000)
      .nullable(),
    signupDeadline: date.nullable(),
  })
  .refine((e) => !e.endsAt || e.endsAt >= e.startsAt, {
    path: ["endsAt"],
    error: "Дуусах цаг эхлэх цагаас хойш байх ёстой.",
  })
  .refine((e) => !e.signupDeadline || e.signupDeadline <= e.startsAt, {
    path: ["signupDeadline"],
    error: "Бүртгэл хаагдах хугацаа арга хэмжээ эхлэхээс өмнө байна.",
  });

/**
 * Member form: the person (name, class, photo, team, e-mail, imported report hours) and their
 * membership in one school year (group, position, «Нийтэд харуулах»).
 */
export const memberInputSchema = z.object({
  name: req(100),
  nameEn: opt(100),
  role: req(100),
  roleEn: opt(100),
  className: z.string().trim().max(20, { error: "Хамгийн ихдээ 20 тэмдэгт." }),
  group: z.enum(["leadership", "member"]),
  photoUrl: imageUrl,
  showPhoto: z.boolean(),
  active: z.boolean(),
  showPublicly: z.boolean(),
  volunteerHours: z.number().int().min(0).max(100_000).nullable(),
  schoolYear: z.string().trim().refine(isSchoolYear, { error: "Хичээлийн жил буруу байна." }),
  team: z.string().trim().max(60, { error: "Хамгийн ихдээ 60 тэмдэгт." }),
  /** Admin-only: offers "link account to member" when this address signs in. */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((v) => v === "" || z.email().safeParse(v).success, { error: "И-мэйл буруу байна." })
    .transform((v) => v || null),
});

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), {
    error: "https:// -ээр эхэлсэн хаяг оруулна уу.",
  });

const text = (max: number, label?: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label ? `${label}: ` : ""}хамгийн ихдээ ${max} тэмдэгт.` });

/** Like `imageUrl` but keeps "" (settings store plain strings). */
const imageUrlText = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"),
    { error: "Зургийн хаяг буруу байна." },
  );

export const settingsInputSchema = z.object({
  schoolYear: z.object({
    current: z
      .string()
      .trim()
      .refine((v) => v === "" || isSchoolYear(v), {
        error: "Хичээлийн жилийг жагсаалтаас сонгоно уу.",
      }),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    text: text(200, "Зарлалын текст"),
    textEn: text(200, "Announcement text"),
    href: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v) || /^\/[^/\s][^\s]*$|^\/$/.test(v), {
        error: "Зарлалын холбоос: /join гэх мэт дотоод зам эсвэл https:// хаяг оруулна.",
      }),
  }),
  membership: z.object({
    rejectedRetentionDays: z
      .number({ error: "7–730 хоног" })
      .int({ error: "Бүхэл тоо" })
      .min(7, { error: "Хамгийн багадаа 7 хоног" })
      .max(730, { error: "Хамгийн ихдээ 730 хоног" }),
    activeMemberHours: z
      .number({ error: "Тоо оруулна уу" })
      .min(1, { error: "1-ээс их" })
      .max(10_000, { error: "Хэт их" })
      .nullable(),
  }),
  club: z.object({
    name: text(120, "Клубын нэр"),
    nameEn: text(120, "Club name"),
    shortName: text(60, "Богино нэр"),
    shortNameEn: text(60, "Short name"),
    description: text(600, "Товч танилцуулга"),
    descriptionEn: text(600, "Short description"),
    foundedYear: z
      .number({ error: "Байгуулагдсан он буруу." })
      .int()
      .min(1900, { error: "Байгуулагдсан он буруу." })
      .max(2100, { error: "Байгуулагдсан он буруу." })
      .nullable(),
  }),
  branding: z.object({
    schoolLogoUrl: imageUrlText,
    heroImageUrl: imageUrlText,
    heroImageAlt: text(200, "Зургийн тайлбар"),
    heroImageAltEn: text(200, "Image description"),
  }),
  contact: z.object({
    address: text(300, "Хаяг"),
    addressEn: text(300, "Address"),
    email: z.union([z.literal(""), z.email({ error: "И-мэйл буруу." })]),
    instagram: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || instagramHandle(v) !== "", {
        error: "Instagram: @нэр эсвэл https://www.instagram.com/нэр/ хэлбэрээр оруулна уу.",
      })
      .transform(instagramHandle),
  }),
  socials: z.array(z.object({ platform: z.enum(socialPlatforms), url: httpsUrl })),
  stats: z
    .array(
      z
        .object({
          kind: z.enum(statKinds),
          label: text(60, "Тоон үзүүлэлтийн нэр"),
          labelEn: text(60, "Stat label"),
          value: text(20, "Тоо"),
          featured: z.boolean(),
        })
        .refine((s) => s.kind !== "custom" || (s.label !== "" && s.value !== ""), {
          error: "Тоон үзүүлэлт бүрт нэр болон тоо хоёуланг нь бөглөнө.",
        }),
    )
    .max(12, { error: "Хамгийн ихдээ 12 тоон үзүүлэлт." })
    .refine((list) => list.filter((s) => s.featured).length <= MAX_FEATURED_STATS, {
      error: `Нүүр хуудсанд хамгийн ихдээ ${MAX_FEATURED_STATS} тоо онцолно.`,
    }),
  partners: z
    .array(
      z.object({
        name: req(120),
        nameEn: text(120, "Partner name"),
        logoUrl: imageUrlText,
        url: httpsUrl,
        type: z.enum(partnerTypes),
      }),
    )
    .max(30, { error: "Хамгийн ихдээ 30 хамтрагч." }),
  donation: z.object({
    url: httpsUrl,
    text: text(1500, "Хандивын мэдээлэл"),
    textEn: text(1500, "Donation info"),
  }),
  helpOptions: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9-]{1,40}$/),
        label: req(80),
        labelEn: text(80, "Option (English)"),
      }),
    )
    .min(1, { error: "Маягтад дор хаяж нэг сонголт байх ёстой." })
    .max(20, { error: "Хамгийн ихдээ 20 сонголт." })
    .refine((list) => new Set(list.map((o) => o.key)).size === list.length, {
      error: "Сонголтын түлхүүр давхардсан байна.",
    }),
});

export const aboutInputSchema = z.object({
  intro: text(1000, "Танилцуулга"),
  introEn: text(1000, "Intro"),
  history: text(5000, "Түүх"),
  historyEn: text(5000, "History"),
  historyPublished: z.boolean(),
  mission: text(1000, "Эрхэм зорилго"),
  missionEn: text(1000, "Mission"),
  values: z
    .array(
      z.object({
        title: req(80),
        titleEn: text(80, "Value title"),
        body: text(300, "Тайлбар"),
        bodyEn: text(300, "Description"),
      }),
    )
    .max(8, { error: "Хамгийн ихдээ 8 үнэт зүйл." }),
});

export const albumInputSchema = z.object({
  title: req(200),
  titleEn: opt(200),
  slug,
  description: z.string().trim().max(1000, { error: "Хамгийн ихдээ 1000 тэмдэгт." }),
  descriptionEn: opt(1000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Огноо буруу байна." }),
  published: z.boolean(),
  eventId: z.string().max(64).nullable(),
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

const supportPair = (label: string) =>
  z.object({
    title: text(80, `${label}: гарчиг`).refine((v) => v !== "", {
      error: `${label}: гарчиг хоосон байна.`,
    }),
    titleEn: text(80, `${label}: title`),
    body: text(400, `${label}: тайлбар`),
    bodyEn: text(400, `${label}: text`),
  });

/** «Дэмжих» page text (admin → «Дэмжих» хуудас). */
export const supportInputSchema = z.object({
  intro: text(300, "Танилцуулга"),
  introEn: text(300, "Intro"),
  ways: z.object({
    volunteer: supportPair("Сайн дурын ажилтан"),
    donateItems: supportPair("Эд зүйлсээр хандивлах"),
    partner: supportPair("Хамтран ажиллах"),
    share: supportPair("Мэдээлэл түгээх"),
  }),
  donate: supportPair("Мөнгөн хандив"),
});

/** «Шинэ хичээлийн жил эхлүүлэх» wizard payload. */
export const startYearSchema = z.object({
  year: z.string().refine(isSchoolYear, { error: "Хичээлийн жил буруу байна." }),
  leaders: z
    .array(
      z.object({
        memberId: z.string().min(1).max(64).nullable(),
        name: z.string().trim().max(100, { error: "Хамгийн ихдээ 100 тэмдэгт." }),
        className: z.string().trim().max(20, { error: "Хамгийн ихдээ 20 тэмдэгт." }),
        position: req(100),
        positionEn: z.string().trim().max(100),
        showPublicly: z.boolean(),
      }),
    )
    .max(30, { error: "Удирдлага хэт олон байна." })
    .refine((list) => list.every((l) => l.memberId || l.name), {
      error: "Шинэ хүний нэрийг бичнэ үү.",
    }),
  copyMemberIds: z.array(z.string().min(1).max(64)).max(1000),
  consent: z.boolean(),
});
