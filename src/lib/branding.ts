import "server-only";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, safeImageUrl } from "@/lib/data/settings";

export type ResolvedBranding = {
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
    schoolLogo:
      safeImageUrl(branding.schoolLogoUrl) ?? (process.env.BRAND_SCHOOL_LOGO_FILE || null),
    unicefLogo:
      safeImageUrl(branding.unicefLogoUrl) ?? (process.env.BRAND_UNICEF_LOGO_FILE || null),
    heroImage: hero
      ? { src: hero, alt: pick(locale, branding.heroImageAlt, branding.heroImageAltEn) }
      : null,
  };
}
