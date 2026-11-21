import { getLocale, getTranslations } from "next-intl/server";
import { BrandLogo, type BrandTone, type BrandVariant } from "./brand-logo";

/**
 * The club logo for server components: picks the locale (mn/en wordmark) and renders both theme
 * files (see BrandLogo). Alt text is the club name unless `decorative` (the same name is visible
 * next to it).
 */
export async function BrandLockup({
  variant,
  height,
  tone,
  priority,
  decorative = false,
  className,
}: {
  variant: BrandVariant;
  height?: number;
  tone?: BrandTone;
  priority?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const locale = (await getLocale()) === "en" ? "en" : "mn";
  const t = await getTranslations("Common");
  return (
    <BrandLogo
      variant={variant}
      locale={locale}
      alt={decorative ? "" : t("logoAlt")}
      height={height}
      tone={tone}
      priority={priority}
      className={className}
    />
  );
}
