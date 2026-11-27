import {
  BellRing,
  CalendarHeart,
  GraduationCap,
  HandHeart,
  type LucideIcon,
  Megaphone,
  Users,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates/format";
import { responsiveSrc } from "@/lib/media/variants";
import { SDGS } from "@/lib/sdg";
import { cn } from "@/lib/utils";

/** Pillar tint (background) + text-safe ink for each tone; both follow the theme tokens. */
const tones = {
  cyan: { bg: "bg-brand-cyan-soft", fg: "text-brand-cyan-strong", dot: "text-brand-cyan" },
  purple: { bg: "bg-brand-purple-soft", fg: "text-brand-purple-strong", dot: "text-brand-purple" },
  green: { bg: "bg-brand-green-soft", fg: "text-brand-green-strong", dot: "text-brand-green" },
  gold: { bg: "bg-brand-gold-soft", fg: "text-brand-gold-strong", dot: "text-brand-gold" },
  blue: { bg: "bg-brand-blue-soft", fg: "text-brand-blue-strong", dot: "text-brand-blue" },
} as const;
type CoverTone = keyof typeof tones;

export const coverIcons = {
  activity: Megaphone,
  education: GraduationCap,
  charity: HandHeart,
  announcement: BellRing,
  event: CalendarHeart,
  members: Users,
} satisfies Record<string, LucideIcon>;
type CoverIcon = keyof typeof coverIcons;

/** Tone per news category / club direction. */
export const categoryTone: Record<string, CoverTone> = {
  activity: "cyan",
  education: "purple",
  charity: "gold",
  announcement: "blue",
};

/** Icon key for a category/direction (unknown → generic event icon). */
export function coverIconFor(key: string | null | undefined): CoverIcon {
  return key && key in coverIcons ? (key as CoverIcon) : "event";
}

/**
 * Cover image. Until a real photo is uploaded, a typographic placeholder: the pillar's tint, a
 * big day + month stamp (when a date is given), the pillar icon in a corner, a faint dot
 * pattern and the related SDGs in their official colours. Light and dark versions come from the
 * tokens. Always fills its parent; the parent sets the aspect ratio (16/10 for cards).
 */
export function CoverImage({
  src,
  alt,
  tone = "cyan",
  icon = "activity",
  sdgs = [],
  date,
  locale,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string | null;
  alt: string;
  tone?: CoverTone;
  icon?: CoverIcon;
  sdgs?: number[];
  /** Shown as a day + month stamp on the placeholder (news/events). */
  date?: Date | string | null;
  locale?: Locale;
  className?: string;
  priority?: boolean;
  /** Rendered width hint for the srcset (cards by default). */
  sizes?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- R2 image, pre-sized on upload
      <img
        src={src}
        {...responsiveSrc(src, sizes)}
        alt={alt}
        // Aspect ratio only (16:10; the box sets the real size). Small numbers on purpose: a
        // large intrinsic width would widen narrow grids on 320 px phones.
        width={160}
        height={100}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn("size-full object-cover dark:brightness-[.92]", className)}
      />
    );
  }
  const Icon = coverIcons[icon];
  const t = tones[tone];
  const goals = sdgs.filter((n) => SDGS[n]).slice(0, 4);
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative flex size-full overflow-hidden", t.bg, className)}
    >
      {/* Faint dot pattern in the pillar colour. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 [background-image:radial-gradient(currentColor_1.2px,transparent_1.6px)] [mask-image:linear-gradient(120deg,transparent_25%,black_80%)] [background-size:18px_18px] opacity-25",
          t.dot,
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute -right-[12%] -bottom-[30%] aspect-square w-[55%] rounded-full bg-current opacity-[.08]",
          t.dot,
        )}
      />
      {date && locale ? (
        <span
          aria-hidden="true"
          className={cn("relative m-[6%] flex flex-col self-start leading-none", t.fg)}
        >
          <span className="font-heading text-[clamp(2.5rem,9cqi,5rem)] font-extrabold tracking-tight tabular-nums">
            {formatDate(locale, date, "day")}
          </span>
          <span className="mt-1 font-heading text-sm font-bold tracking-[0.08em] uppercase">
            {formatDate(locale, date, "monthShort")}
          </span>
        </span>
      ) : (
        <span aria-hidden="true" className="relative m-auto">
          <Icon className={cn("size-14 opacity-80", t.fg)} strokeWidth={1.6} />
        </span>
      )}
      {date && locale && (
        <span
          aria-hidden="true"
          className="absolute top-[7%] right-[5%] flex size-10 items-center justify-center rounded-2xl bg-card/80 shadow-soft"
        >
          <Icon className={cn("size-5", t.fg)} strokeWidth={1.9} />
        </span>
      )}
      {goals.length > 0 && (
        <span aria-hidden="true" className="absolute bottom-[7%] left-[5%] flex gap-1.5">
          {goals.map((n) => (
            <span
              key={n}
              style={{ backgroundColor: SDGS[n]!.color }}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 font-heading text-xs leading-none font-extrabold shadow-sm ring-2 ring-card/80",
                SDGS[n]!.text === "light" ? "text-white" : "text-black",
              )}
            >
              <span className="mr-0.5 text-[0.6rem]">SDG</span>
              {n}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
