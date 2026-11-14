import { z } from "zod";

/**
 * Site settings edited in /admin (stored as JSON rows in the D1 `settings` table).
 * Shared by server and client code: types, defaults and a lenient parser for stored values.
 *
 * Principle: nothing invented is ever shown as fact. Every default below is empty, except
 * general wording (mission, values, help options) that is not a factual claim.
 * Fields with an `...En` twin are optional; an empty English value falls back to Mongolian.
 */

export const socialPlatforms = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "telegram",
  "x",
  "website",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export type SocialLink = { platform: SocialPlatform; url: string };

export type ClubInfo = {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  foundedYear: number | null;
};

export type Branding = {
  schoolLogoUrl: string;
  unicefLogoUrl: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroImageAltEn: string;
};

export type ContactInfo = {
  address: string;
  addressEn: string;
  email: string;
  phone: string;
  officeHours: string;
  officeHoursEn: string;
  /** Google Maps embed URL (https://www.google.com/maps/embed?pb=...) */
  mapEmbedUrl: string;
  /** Alternative to the embed URL: decimal coordinates. */
  mapLat: string;
  mapLng: string;
};

export const statKinds = ["custom", "members", "events"] as const;
export type StatKind = (typeof statKinds)[number];
/** `members` / `events` are counted from D1 (active members / past published events). */
export type StatItem = { kind: StatKind; label: string; labelEn: string; value: string };

export const partnerTypes = ["partner", "beneficiary"] as const;
export type PartnerType = (typeof partnerTypes)[number];
/** `beneficiary` = an organisation that received donations (shown as "хандив хүлээн авагч"). */
export type Partner = {
  name: string;
  nameEn: string;
  logoUrl: string;
  url: string;
  type: PartnerType;
};

export type Donation = { url: string; text: string; textEn: string };

export type HelpOptionItem = { key: string; label: string; labelEn: string };

export type ValueItem = { title: string; titleEn: string; body: string; bodyEn: string };

/**
 * About page text. "What we do" is not stored here: it is built from the activities in D1,
 * grouped by the club's three directions.
 */
export type AboutContent = {
  intro: string;
  introEn: string;
  history: string;
  historyEn: string;
  /** Text stays hidden on the public page until an admin confirms and publishes it. */
  historyPublished: boolean;
  mission: string;
  missionEn: string;
  values: ValueItem[];
};

export type SiteSettings = {
  club: ClubInfo;
  branding: Branding;
  contact: ContactInfo;
  socials: SocialLink[];
  stats: StatItem[];
  partners: Partner[];
  donation: Donation;
  helpOptions: HelpOptionItem[];
  about: AboutContent;
};

/** Settings row keys in D1. */
export const SETTINGS_KEYS = {
  club: "club",
  branding: "branding",
  contact: "contact",
  socials: "socials",
  stats: "stats",
  partners: "partners",
  donation: "donation",
  helpOptions: "helpOptions",
  about: "page.about",
} as const satisfies Record<keyof SiteSettings, string>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const defaultHelpOptions: HelpOptionItem[] = [
  { key: "events", label: "Арга хэмжээ зохион байгуулах", labelEn: "Organising events" },
  { key: "reading", label: "Бага ангийнханд туслах", labelEn: "Helping younger pupils" },
  { key: "charity", label: "Хандивын аян", labelEn: "Donation drives" },
  { key: "media", label: "Гэрэл зураг, видео, сошиал", labelEn: "Photo, video, social media" },
  { key: "design", label: "Дизайн, зураг зурах", labelEn: "Design & drawing" },
  { key: "other", label: "Бусад", labelEn: "Other" },
];

/** About page defaults: general mission/values only — no club history is assumed. */
export const defaultAbout: AboutContent = {
  intro: "",
  introEn: "",
  history: "",
  historyEn: "",
  historyPublished: false,
  mission:
    "Сургууль дотор болон гадна хүүхдүүдэд туслах, хүүхдийн эрхийг сурталчлах, сайн дурын үйлсээр дамжуулан халамжтай нийгмийг хамтдаа бүтээх.",
  missionEn:
    "To help children inside and outside our school, promote children's rights and build a caring community through volunteering.",
  values: [
    {
      title: "Халамж",
      titleEn: "Care",
      body: "Хүүхэд бүрийг хайрлаж, хүндэтгэнэ.",
      bodyEn: "We love and respect every child.",
    },
    {
      title: "Тэгш байдал",
      titleEn: "Equality",
      body: "Хэнийг ч ялгаварлан гадуурхахгүй.",
      bodyEn: "We never discriminate against anyone.",
    },
    {
      title: "Хамтын ажиллагаа",
      titleEn: "Teamwork",
      body: "Хамтдаа бид илүү ихийг бүтээнэ.",
      bodyEn: "Together we achieve more.",
    },
    {
      title: "Итгэл, хариуцлага",
      titleEn: "Trust & responsibility",
      body: "Амласнаа биелүүлж, ил тод ажиллана.",
      bodyEn: "We keep our promises and work transparently.",
    },
  ],
};

export const defaultSettings: SiteSettings = {
  club: { name: "", nameEn: "", description: "", descriptionEn: "", foundedYear: 2025 },
  branding: {
    schoolLogoUrl: "",
    unicefLogoUrl: "",
    heroImageUrl: "",
    heroImageAlt: "",
    heroImageAltEn: "",
  },
  contact: {
    address: "",
    addressEn: "",
    email: "",
    phone: "",
    officeHours: "",
    officeHoursEn: "",
    mapEmbedUrl: "",
    mapLat: "",
    mapLng: "",
  },
  socials: [],
  stats: [],
  partners: [],
  donation: { url: "", text: "", textEn: "" },
  helpOptions: defaultHelpOptions,
  about: defaultAbout,
};

// ---------------------------------------------------------------------------
// Lenient parsing of stored values (bad or legacy data never breaks the site)
// ---------------------------------------------------------------------------

const str = (max = 5000) =>
  z
    .string()
    .transform((v) => v.trim().slice(0, max))
    .catch("");
const bool = (fallback: boolean) => z.boolean().catch(fallback);
const list = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr
        .map((v) => item.safeParse(v))
        .filter((r) => r.success)
        .map((r) => r.data as z.output<T>)
        .slice(0, max),
    );

const storedSchemas = {
  club: z.object({
    name: str(120),
    nameEn: str(120),
    description: str(600),
    descriptionEn: str(600),
    foundedYear: z.number().int().min(1900).max(2100).nullable().catch(null),
  }),
  branding: z.object({
    schoolLogoUrl: str(500),
    unicefLogoUrl: str(500),
    heroImageUrl: str(500),
    heroImageAlt: str(200),
    heroImageAltEn: str(200),
  }),
  contact: z.object({
    address: str(300),
    addressEn: str(300),
    email: str(254),
    phone: str(40),
    officeHours: str(120),
    officeHoursEn: str(120),
    mapEmbedUrl: str(2000),
    mapLat: str(20),
    mapLng: str(20),
  }),
  socials: list(
    z.object({ platform: z.enum(socialPlatforms), url: z.string().trim().min(1).max(500) }),
    socialPlatforms.length,
  ),
  stats: list(
    z.object({
      kind: z.enum(statKinds).catch("custom"),
      label: str(60),
      labelEn: str(60),
      value: str(20),
    }),
    12,
  ),
  partners: list(
    z.object({
      name: z.string().trim().min(1).max(120),
      nameEn: str(120),
      logoUrl: str(500),
      url: str(500),
      type: z.enum(partnerTypes).catch("partner"),
    }),
    30,
  ),
  donation: z.object({ url: str(500), text: str(1500), textEn: str(1500) }),
  helpOptions: list(
    z.object({
      key: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]{1,40}$/),
      label: z.string().trim().min(1).max(80),
      labelEn: str(80),
    }),
    20,
  ),
  about: z.object({
    intro: str(1000),
    introEn: str(1000),
    history: str(5000),
    historyEn: str(5000),
    historyPublished: bool(false),
    mission: str(1000),
    missionEn: str(1000),
    values: list(
      z.object({
        title: z.string().trim().min(1).max(80),
        titleEn: str(80),
        body: str(300),
        bodyEn: str(300),
      }),
      8,
    ),
  }),
};

/**
 * Builds SiteSettings from D1 rows. A missing row uses the default; a stored row is parsed
 * field by field (unknown/legacy fields are dropped, invalid ones become empty).
 */
export function parseSettings(rows: Map<string, unknown>): SiteSettings {
  const read = <K extends keyof SiteSettings>(key: K): SiteSettings[K] => {
    if (!rows.has(SETTINGS_KEYS[key])) return defaultSettings[key];
    const parsed = storedSchemas[key].safeParse(rows.get(SETTINGS_KEYS[key]));
    return parsed.success ? (parsed.data as SiteSettings[K]) : defaultSettings[key];
  };
  const settings: SiteSettings = {
    club: read("club"),
    branding: read("branding"),
    contact: read("contact"),
    socials: read("socials").filter((s) => s.url),
    stats: read("stats"),
    partners: read("partners"),
    donation: read("donation"),
    helpOptions: read("helpOptions"),
    about: read("about"),
  };
  // Legacy rows (before the settings redesign): `donationUrl` string.
  const legacyDonation = rows.get("donationUrl");
  if (!rows.has(SETTINGS_KEYS.donation) && typeof legacyDonation === "string") {
    settings.donation = { ...settings.donation, url: legacyDonation };
  }
  if (settings.helpOptions.length === 0) settings.helpOptions = defaultHelpOptions;
  return settings;
}
