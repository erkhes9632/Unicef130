import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { LogoImage } from "./logo-image";

/** "130-р сургууль × UNICEF" — both logos side by side, optionally with the club name. */
export async function BrandLockup({
  size = 40,
  showText = true,
  className,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  const t = await getTranslations("Common");
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex items-center gap-1.5">
        <LogoImage
          src={siteConfig.logos.school.src}
          alt={siteConfig.logos.school.alt}
          size={size}
          placeholderLabel={t("logoPlaceholder")}
        />
        <span aria-hidden="true" className="text-sm font-bold text-muted-foreground">
          ×
        </span>
        <LogoImage
          src={siteConfig.logos.unicef.src}
          alt={siteConfig.logos.unicef.alt}
          size={size}
          placeholderLabel={t("logoPlaceholder")}
        />
      </span>
      {showText && (
        <span className="flex flex-col leading-tight whitespace-nowrap">
          <span className="font-heading text-base font-extrabold tracking-tight">
            {t("clubName")}
          </span>
          <span className="text-xs text-muted-foreground">{t("brandPair")}</span>
        </span>
      )}
    </span>
  );
}
