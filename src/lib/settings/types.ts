import "@/lib/validation/zod-config";
import { z } from "zod";

/**
 * Site settings edited in /admin (stored as JSON rows in the D1 `settings` table).
 * Shared by server and client code: types, defaults and a lenient parser for stored values.
 *
 * Principle: nothing invented is ever shown as fact. Every default below is empty, except
 * general wording (mission, values, help options) that is not a factual claim.
 * Fields with an `...En` twin are optional; an empty English value falls back to Mongolian.
 */

/** Other social accounts (Instagram is a contact channel: `ContactInfo.instagram`). */
export const socialPlatforms = [
  "facebook",
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
  /** Short form for page titles / social cards; falls back to the full name. */
  shortName: string;
  shortNameEn: string;
  description: string;
  descriptionEn: string;
  foundedYear: number | null;
};

/**
 * The club logo is the static kit in public/brand/ (not a setting). The school's own logo is an
 * optional upload, shown small on the About page only.
 */
export type Branding = {
  schoolLogoUrl: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroImageAltEn: string;
};

/**
 * How people reach the club (footer on every page + /support). There is no contact form: an
 * e-mail address and an Instagram account. An empty value hides that item.
 */
export type ContactInfo = {
  address: string;
  addressEn: string;
  email: string;
  /** Instagram handle without "@" (a pasted profile URL is accepted and reduced to it). */
  instagram: string;
};

export const statKinds = ["custom", "members", "events"] as const;
export type StatKind = (typeof statKinds)[number];
/**
 * `members` = active members counted in D1. `events` = activities of the latest school year from
 * the official yearly report (admin → Жилийн үр дүн), so every page shows the same number.
 * `featured` items appear in the home page band (max 5); /impact shows all of them.
 */
export type StatItem = {
  kind: StatKind;
  label: string;
  labelEn: string;
  value: string;
  featured: boolean;
};
export const MAX_FEATURED_STATS = 5;

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

export type MembershipSettings = {
  /** Rejected applications are deleted this many days after their period closes. */
  rejectedRetentionDays: number;
  /** Yearly volunteer hours for "идэвхтэй гишүүн"; null = not set (progress bar hidden). */
  activeMemberHours: number | null;
};

export const supportWays = ["volunteer", "donateItems", "partner", "share"] as const;
export type SupportWay = (typeof supportWays)[number];
type TextPair = { title: string; titleEn: string; body: string; bodyEn: string };

/**
 * «Биднийг хэрхэн дэмжих вэ?» (/support) text, edited in admin. The defaults are the club's
 * first draft: the club should confirm them (PROGRESS). Contact channels come from `contact`.
 */
export type SupportContent = {
  intro: string;
  introEn: string;
  ways: Record<SupportWay, TextPair>;
  donate: TextPair;
};

/** Manual site-wide banner (the recruitment banner appears on its own while a period is open). */
export type Announcement = { enabled: boolean; text: string; textEn: string; href: string };

export type SiteSettings = {
  announcement: Announcement;
  club: ClubInfo;
  membership: MembershipSettings;
  branding: Branding;
  contact: ContactInfo;
  socials: SocialLink[];
  stats: StatItem[];
  partners: Partner[];
  donation: Donation;
  helpOptions: HelpOptionItem[];
  about: AboutContent;
  support: SupportContent;
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
  support: "page.support",
  membership: "membership",
  announcement: "announcement",
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

export const defaultSupport: SupportContent = {
  intro: "Таны жижиг тусламж ч гэсэн хүүхдийн амьдралд том өөрчлөлт авчирна.",
  introEn: "Even a small act of help can make a big difference in a child's life.",
  ways: {
    volunteer: {
      title: "Сайн дурын ажилтан болох",
      titleEn: "Volunteer",
      body: "Арга хэмжээнд туслах, зохион байгуулалтад оролцох.",
      bodyEn: "Help at events and with organising them.",
    },
    donateItems: {
      title: "Эд зүйлсээр хандивлах",
      titleEn: "Donate items",
      body: "Дулаан хувцас, ном, бичгийн хэрэгсэл, тоглоом — цэвэр, бүтэн байхад л болно.",
      bodyEn: "Warm clothes, books, school supplies, toys — clean and in good condition.",
    },
    partner: {
      title: "Хамтран ажиллах",
      titleEn: "Partner with us",
      body: "Байгууллага, бизнесүүд хамтарсан аян, төсөл санаачилж болно.",
      bodyEn: "Organisations and businesses can start joint campaigns and projects.",
    },
    share: {
      title: "Мэдээлэл түгээх",
      titleEn: "Spread the word",
      body: "Манай аянуудыг найз нөхөд, гэр бүлдээ хуваалцаарай.",
      bodyEn: "Share our campaigns with your friends and family.",
    },
  },
  donate: {
    title: "Мөнгөн хандив",
    titleEn: "Financial donations",
    body: "Мөнгөн хандивыг зөвхөн сургуулийн албан ёсны журмын дагуу хүлээн авна.",
    bodyEn: "Financial donations are accepted only according to official school procedures.",
  },
};

export const defaultSettings: SiteSettings = {
  announcement: { enabled: false, text: "", textEn: "", href: "" },
  membership: { rejectedRetentionDays: 90, activeMemberHours: null },
  club: {
    name: "",
    nameEn: "",
    shortName: "",
    shortNameEn: "",
    description: "",
    descriptionEn: "",
    foundedYear: 2025,
  },
  branding: {
    schoolLogoUrl: "",
    heroImageUrl: "",
    heroImageAlt: "",
    heroImageAltEn: "",
  },
  // The club's own channels (given by the club, 2026-11-25); editable in admin.
  contact: {
    address: "130-р сургууль, Хан-Уул дүүрэг, 15-р хороо, Улаанбаатар",
    addressEn: "School No. 130, 15th khoroo, Khan-Uul District, Ulaanbaatar",
    email: "130foreverychild@gmail.com",
    instagram: "130_foreverychild",
  },
  socials: [],
  stats: [],
  partners: [],
  donation: { url: "", text: "", textEn: "" },
  helpOptions: defaultHelpOptions,
  about: defaultAbout,
  support: defaultSupport,
};

// ---------------------------------------------------------------------------
// Lenient parsing of stored values (bad or legacy data never breaks the site)
// ---------------------------------------------------------------------------

/** "@name", "name" or "https://www.instagram.com/name/" → "name" ("" when it isn't one). */
export function instagramHandle(value: string): string {
  const v = value.trim();
  const fromUrl =
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i.exec(v);
  const handle = (fromUrl?.[1] ?? v).replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : "";
}

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle}/`;

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
  announcement: z.object({
    enabled: bool(false),
    text: str(200),
    textEn: str(200),
    href: str(500),
  }),
  membership: z.object({
    rejectedRetentionDays: z.number().int().min(7).max(730).catch(90),
    activeMemberHours: z.number().min(1).max(10_000).nullable().catch(null),
  }),
  club: z.object({
    name: str(120),
    nameEn: str(120),
    shortName: str(60),
    shortNameEn: str(60),
    description: str(600),
    descriptionEn: str(600),
    foundedYear: z.number().int().min(1900).max(2100).nullable().catch(null),
  }),
  branding: z.object({
    schoolLogoUrl: str(500),
    heroImageUrl: str(500),
    heroImageAlt: str(200),
    heroImageAltEn: str(200),
  }),
  contact: z.object({
    address: str(300),
    addressEn: str(300),
    email: str(254),
    instagram: str(200).transform(instagramHandle),
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
      featured: bool(true),
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
  support: z.object({
    intro: str(300),
    introEn: str(300),
    ways: z
      .object({
        volunteer: z
          .object({ title: str(80), titleEn: str(80), body: str(400), bodyEn: str(400) })
          .catch(defaultSupport.ways.volunteer),
        donateItems: z
          .object({ title: str(80), titleEn: str(80), body: str(400), bodyEn: str(400) })
          .catch(defaultSupport.ways.donateItems),
        partner: z
          .object({ title: str(80), titleEn: str(80), body: str(400), bodyEn: str(400) })
          .catch(defaultSupport.ways.partner),
        share: z
          .object({ title: str(80), titleEn: str(80), body: str(400), bodyEn: str(400) })
          .catch(defaultSupport.ways.share),
      })
      .catch(defaultSupport.ways),
    donate: z
      .object({ title: str(80), titleEn: str(80), body: str(400), bodyEn: str(400) })
      .catch(defaultSupport.donate),
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
    announcement: read("announcement"),
    club: read("club"),
    membership: read("membership"),
    branding: read("branding"),
    contact: read("contact"),
    socials: read("socials").filter((s) => s.url),
    stats: read("stats"),
    partners: read("partners"),
    donation: read("donation"),
    helpOptions: read("helpOptions"),
    about: read("about"),
    support: read("support"),
  };
  // Legacy rows (before the settings redesign): `donationUrl` string.
  const legacyDonation = rows.get("donationUrl");
  if (!rows.has(SETTINGS_KEYS.donation) && typeof legacyDonation === "string") {
    settings.donation = { ...settings.donation, url: legacyDonation };
  }
  if (settings.helpOptions.length === 0) settings.helpOptions = defaultHelpOptions;
  return settings;
}
