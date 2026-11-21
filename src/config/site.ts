/**
 * Static site configuration. Everything the club edits (club info, logos, contact, social
 * links, stats, partners, donation info, About page) lives in admin → Сайтын тохиргоо
 * (D1 `settings`); see src/lib/settings/types.ts for the shapes and empty defaults.
 */

export const siteConfig = {
  /** Fallbacks only: the real names come from admin → Сайтын тохиргоо → Клубын мэдээлэл. */
  name: "130-р сургуулийн UNICEF клуб",
  shortName: "130-р сургуулийн UNICEF клуб",
  schoolName: "130-р сургууль",
} as const;

/** Public navigation (labels come from messages → Nav). */
export const mainNav = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "impact", href: "/impact" },
  { key: "news", href: "/news" },
  { key: "events", href: "/events" },
  { key: "members", href: "/members" },
  { key: "gallery", href: "/gallery" },
  { key: "support", href: "/support" },
  { key: "contact", href: "/contact" },
  { key: "faq", href: "/faq" },
] as const;

/**
 * Public names of students. Both stay **false** until the club has written consent from parents
 * or guardians (privacy rule: members are mostly minors). Leadership cards then show the role and
 * a role-initial avatar only; /members shows aggregate numbers only. Turning one on still shows
 * only rows an admin marked «Нэрийг нийтэд харуулах» (show_publicly). See README → Дизайн систем.
 */
export const SHOW_LEADER_NAMES = false;
export const SHOW_MEMBER_NAMES = false;
