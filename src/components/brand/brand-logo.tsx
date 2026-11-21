/**
 * The club's official logo kit (public/brand/*.svg, transparent, used exactly as delivered).
 * A plain component (no server or client APIs) so server pages, client error pages and the
 * certificate can all use it. The server wrapper `BrandLockup` picks the locale for you.
 *
 * Both theme files are rendered and CSS shows the right one (`dark:hidden` / `hidden dark:block`),
 * so switching the theme never flashes a wrong logo. Every <img> has a fixed width and height
 * (no layout shift). Swap a logo by replacing the file in public/brand/ with the same name and
 * the same artboard (the aspect ratios below come from the files' viewBox).
 */
import { cn } from "@/lib/utils";

export type BrandVariant = "horizontal" | "compact" | "stacked" | "mark";
/** `auto` follows the site theme; the others force one file (e.g. light paper, photos, print). */
export type BrandTone = "auto" | "light" | "dark" | "white" | "mono";

/** viewBox width / height of each file (mn and en wordmarks differ in width). */
const RATIO = {
  horizontal: { mn: 551.3 / 120, en: 471.7 / 120 },
  compact: { mn: 358.6 / 64, en: 351.4 / 64 },
  stacked: { mn: 516 / 506, en: 516 / 506 },
  mark: { mn: 1, en: 1 },
} as const satisfies Record<BrandVariant, Record<"mn" | "en", number>>;

/** Default heights (px) per variant. */
export const BRAND_HEIGHT = { horizontal: 44, compact: 32, stacked: 120, mark: 40 } as const;

export function brandLogoSrc(
  variant: BrandVariant,
  locale: "mn" | "en",
  tone: Exclude<BrandTone, "auto">,
) {
  const lang = variant === "horizontal" || variant === "compact" ? `-${locale}` : "";
  return `/brand/logo-${variant}${lang}-${tone}.svg`;
}

export function brandLogoSize(variant: BrandVariant, locale: "mn" | "en", height: number) {
  return { width: Math.round(height * RATIO[variant][locale]), height };
}

export function BrandLogo({
  variant,
  locale,
  alt,
  height = BRAND_HEIGHT[variant],
  tone = "auto",
  priority = false,
  className,
}: {
  variant: BrandVariant;
  locale: "mn" | "en";
  /** Club name, or "" when the same name is visible right next to the logo. */
  alt: string;
  height?: number;
  tone?: BrandTone;
  /** Header logo only: fetchpriority="high". */
  priority?: boolean;
  className?: string;
}) {
  const size = brandLogoSize(variant, locale, height);
  const img = (t: Exclude<BrandTone, "auto">, cls: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from public/brand, no optimizer needed
    <img
      key={t}
      src={brandLogoSrc(variant, locale, t)}
      alt={alt}
      width={size.width}
      height={size.height}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      // Lazy: the hidden theme file (display: none) is then never downloaded.
      loading={priority ? undefined : "lazy"}
      style={{ width: size.width, height: size.height, maxWidth: "none" }}
      className={cn("shrink-0 select-none", cls, className)}
      draggable={false}
    />
  );
  if (tone !== "auto") return img(tone, "block");
  return (
    <>
      {img("light", "block dark:hidden")}
      {img("dark", "hidden dark:block")}
    </>
  );
}
