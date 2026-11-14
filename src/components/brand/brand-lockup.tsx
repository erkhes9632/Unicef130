import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getBranding } from "@/lib/branding";
import { pick } from "@/lib/data/localize";
import { getSiteSettings } from "@/lib/data/settings";
import { cn } from "@/lib/utils";
import { LogoImage, Monogram } from "./logo-image";

/**
 * "130-р сургууль × UNICEF" — the logos that exist, optionally with the club name.
 * Without any logo file a single "130" monogram is shown (never a broken image).
 */
export async function BrandLockup({
  size = 40,
  showText = true,
  wrapText = false,
  className,
}: {
  size?: number;
  showText?: boolean;
  /** Let a long club name wrap (footer, narrow columns) instead of staying on one line. */
  wrapText?: boolean;
  className?: string;
}) {
  const locale = (await getLocale()) as Locale;
  const [t, branding, { club }] = await Promise.all([
    getTranslations("Common"),
    getBranding(locale),
    getSiteSettings(),
  ]);
  const name = pick(locale, club.name, club.nameEn) || t("clubName");
  const hasAny = branding.schoolLogo || branding.unicefLogo;

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex items-center gap-1.5">
        {hasAny ? (
          <>
            {branding.schoolLogo && (
              <LogoImage
                src={branding.schoolLogo}
                alt={t("schoolLogoAlt")}
                size={size}
                monogram="130"
              />
            )}
            {branding.schoolLogo && branding.unicefLogo && (
              <span aria-hidden="true" className="text-sm font-bold text-muted-foreground">
                ×
              </span>
            )}
            {branding.unicefLogo && (
              <LogoImage
                src={branding.unicefLogo}
                alt={t("unicefLogoAlt")}
                size={size}
                monogram="U"
              />
            )}
          </>
        ) : (
          <Monogram text="130" size={size} label={showText ? undefined : name} />
        )}
      </span>
      {showText && (
        <span
          className={cn("flex min-w-0 flex-col leading-tight", !wrapText && "whitespace-nowrap")}
        >
          <span className="font-heading text-base font-extrabold tracking-tight">{name}</span>
          <span className="text-xs text-muted-foreground">{t("brandPair")}</span>
        </span>
      )}
    </span>
  );
}
