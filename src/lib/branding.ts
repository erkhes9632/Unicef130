import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, safeImageUrl } from "@/lib/data/settings";

export type ResolvedBranding = {
  ogImage: string | null;
  schoolLogo: string | null;
  unicefLogo: string | null;
  heroImage: { src: string; alt: string } | null;
};

/**
 * Logos: admin upload (R2) → file in public/logos/ (detected at build time) → none, in which
 * case components render a text monogram instead of a broken image.
 */
export async function getBranding(locale: Locale): Promise<ResolvedBranding> {
  const { branding } = await getSiteSettings();
  const hero = safeImageUrl(branding.heroImageUrl);
  return {
    ogImage: safeImageUrl(branding.ogImageUrl),
    schoolLogo:
      safeImageUrl(branding.schoolLogoUrl) ?? (process.env.BRAND_SCHOOL_LOGO_FILE || null),
    unicefLogo:
      safeImageUrl(branding.unicefLogoUrl) ?? (process.env.BRAND_UNICEF_LOGO_FILE || null),
    heroImage: hero
      ? { src: hero, alt: pick(locale, branding.heroImageAlt, branding.heroImageAltEn) }
      : null,
  };
}

/** Club names for this locale: full (header, footer, JSON-LD) and short (titles, og:site_name). */
export async function getClubNames(locale: Locale) {
  const [{ club }, t] = await Promise.all([
    getSiteSettings(),
    getTranslations({ locale, namespace: "Common" }),
  ]);
  const name = pick(locale, club.name, club.nameEn) || t("clubName");
  const short = pick(locale, club.shortName, club.shortNameEn) || name;
  return { name, short };
}
