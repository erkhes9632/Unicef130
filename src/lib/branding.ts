import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, safeImageUrl } from "@/lib/data/settings";

type ResolvedBranding = {
  /** The school's own logo (admin upload), shown small on the About page only. */
  schoolLogo: string | null;
  heroImage: { src: string; alt: string } | null;
};

/** Admin-uploaded images. The club logo itself is the static kit in public/brand/. */
export async function getBranding(locale: Locale): Promise<ResolvedBranding> {
  const { branding } = await getSiteSettings();
  const hero = safeImageUrl(branding.heroImageUrl);
  return {
    schoolLogo: safeImageUrl(branding.schoolLogoUrl),
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
