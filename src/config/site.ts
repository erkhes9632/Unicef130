/**
 * Static site configuration and *fallback* values.
 * From Phase 5 on, contact info / social links / stats / donation link are editable in
 * /admin → Site settings (stored in D1). These values are used until the admin saves them.
 */

export const siteConfig = {
  name: "130 UNICEF клуб",
  shortName: "130 UNICEF",
  schoolName: "130-р сургууль",
  foundedYear: 2025,
  logos: {
    school: { src: "/logos/school-130.png" },
    unicef: { src: "/logos/unicef.png" },
  },
} as const;

export type SocialPlatform = "facebook" | "instagram" | "youtube" | "tiktok" | "telegram" | "x";

export type SocialLink = { platform: SocialPlatform; url: string };

export type ContactInfo = {
  address: string;
  addressEn: string;
  email: string;
  phone: string;
  /** Google Maps embed URL (https://www.google.com/maps/embed?pb=...) */
  mapEmbedUrl: string;
  officeHours: string;
  officeHoursEn: string;
};

// TODO(content): real address, phone, email and map location of School No. 130.
export const fallbackContact: ContactInfo = {
  address: "Улаанбаатар хот, 130-р сургууль",
  addressEn: "School No. 130, Ulaanbaatar, Mongolia",
  email: "unicef.club130@example.com",
  phone: "+976 0000 0000",
  mapEmbedUrl: "",
  officeHours: "Даваа–Баасан, 13:00–17:00",
  officeHoursEn: "Mon–Fri, 13:00–17:00",
};

// TODO(content): real social media links (empty url = hidden).
export const fallbackSocials: SocialLink[] = [
  { platform: "facebook", url: "" },
  { platform: "instagram", url: "" },
  { platform: "youtube", url: "" },
  { platform: "tiktok", url: "" },
];

// TODO(content): real numbers for the homepage stats.
export const fallbackStats = {
  members: 40,
  events: 12,
  volunteerHours: 300,
  childrenHelped: 500,
};

// TODO(content): real donation / support link (placeholder only, may stay empty).
export const fallbackDonationUrl = "";

/** Public navigation (labels come from messages → Nav). */
export const mainNav = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "news", href: "/news" },
  { key: "events", href: "/events" },
  { key: "members", href: "/members" },
  { key: "gallery", href: "/gallery" },
  { key: "support", href: "/support" },
  { key: "contact", href: "/contact" },
] as const;

export type NavKey = (typeof mainNav)[number]["key"];
