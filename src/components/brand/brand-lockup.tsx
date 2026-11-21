import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getBranding } from "@/lib/branding";
import { pick } from "@/lib/data/localize";
import { getSiteSettings } from "@/lib/data/settings";
import { cn } from "@/lib/utils";
import { LogoImage, Monogram } from "./logo-image";

const variants = {
  /** Site header: 36 px logos; the title hides where the desktop nav needs the room. */
  header: {
    logo: 34,
    title: "text-[0.95rem] sr-only sm:not-sr-only lg:sr-only xl:not-sr-only",
    wrap: "whitespace-nowrap",
    sub: "hidden",
  },
  /** Footer: bigger logos, title + "130-р сургууль × UNICEF". */
  footer: { logo: 44, title: "text-base", sub: "block", wrap: "sm:whitespace-nowrap" },
  /** Admin sidebar (narrow column): the name may wrap. */
  sidebar: { logo: 28, title: "text-sm", sub: "block", wrap: "" },
  /** Logos only (the accessible name comes from the surrounding link). */
  compact: { logo: 30, title: "sr-only", sub: "hidden", wrap: "whitespace-nowrap" },
} as const;

/**
 * The logo slot of the site: "130-р сургууль × UNICEF" logos (admin upload or public/logos/*)
 * on a light tile — they are raster files with white backgrounds, so the tile keeps them
 * looking intentional in dark mode too — plus the club name on one line. Logos are never
 * drawn: without any logo file a "130" monogram is shown. Swap logos in Админ → Сайтын
 * тохиргоо → Лого (or public/logos/*.png), no code change needed.
 */
export async function BrandLockup({
  variant = "header",
  className,
}: {
  variant?: keyof typeof variants;
  className?: string;
}) {
  const v = variants[variant];
  const locale = (await getLocale()) as Locale;
  const [t, branding, { club }] = await Promise.all([
    getTranslations("Common"),
    getBranding(locale),
    getSiteSettings(),
  ]);
  const name = pick(locale, club.name, club.nameEn) || t("clubName");
  const hasAny = branding.schoolLogo || branding.unicefLogo;

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {hasAny ? (
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-white p-1 shadow-soft ring-1 ring-black/5">
          {branding.schoolLogo && (
            <LogoImage
              src={branding.schoolLogo}
              alt={t("schoolLogoAlt")}
              size={v.logo}
              monogram="130"
            />
          )}
          {branding.schoolLogo && branding.unicefLogo && (
            <span aria-hidden="true" className="h-5 w-px bg-black/10" />
          )}
          {branding.unicefLogo && (
            <LogoImage
              src={branding.unicefLogo}
              alt={t("unicefLogoAlt")}
              size={v.logo}
              monogram="U"
            />
          )}
        </span>
      ) : (
        <Monogram text="130" size={v.logo + 6} />
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        {/* `not-sr-only` resets white-space, so the no-wrap rule sits on an inner span. */}
        <span className={cn("font-heading font-extrabold tracking-tight", v.title)}>
          <span className={v.wrap || undefined}>{name}</span>
        </span>
        <span className={cn("text-xs text-muted-foreground", v.wrap, v.sub)}>{t("brandPair")}</span>
      </span>
    </span>
  );
}
