import {
  BellRing,
  CalendarHeart,
  GraduationCap,
  HandHeart,
  type LucideIcon,
  Megaphone,
  Users,
} from "lucide-react";
import { SDGS } from "@/lib/sdg";
import { cn } from "@/lib/utils";

const tones = {
  cyan: "from-brand-cyan/85 to-brand-blue/75",
  purple: "from-brand-purple/85 to-brand-blue/65",
  green: "from-brand-green/85 to-brand-cyan/65",
  gold: "from-brand-gold/90 to-brand-purple/55",
  blue: "from-brand-blue/85 to-brand-purple/65",
} as const;
export type CoverTone = keyof typeof tones;

export const coverIcons = {
  activity: Megaphone,
  education: GraduationCap,
  charity: HandHeart,
  announcement: BellRing,
  event: CalendarHeart,
  members: Users,
} satisfies Record<string, LucideIcon>;
export type CoverIcon = keyof typeof coverIcons;

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
 * Cover image. Until a real photo is uploaded, a designed placeholder is shown: club colors per
 * direction, the direction icon and the related SDG numbers in their official colors.
 * Always fills its parent; the parent sets the aspect ratio.
 */
export function CoverImage({
  src,
  alt,
  tone = "cyan",
  icon = "activity",
  sdgs = [],
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  tone?: CoverTone;
  icon?: CoverIcon;
  sdgs?: number[];
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- R2 image, pre-sized on upload
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }
  const Icon = coverIcons[icon];
  const goals = sdgs.filter((n) => SDGS[n]).slice(0, 4);
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative flex size-full items-center justify-center overflow-hidden bg-linear-to-br",
        tones[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[12%] -left-[8%] aspect-square w-[38%] rounded-full bg-white/20"
      />
      <span
        aria-hidden="true"
        className="absolute -right-[10%] -bottom-[22%] aspect-square w-[48%] rounded-full bg-white/15"
      />
      <span
        aria-hidden="true"
        className="absolute top-[18%] right-[14%] aspect-square w-[9%] rotate-12 rounded-[30%] bg-white/25"
      />
      <span
        aria-hidden="true"
        className="relative flex aspect-square w-[22%] max-w-36 min-w-14 items-center justify-center rounded-[30%] bg-white/25 ring-1 ring-white/40 backdrop-blur-sm"
      >
        <Icon className="size-1/2 text-white drop-shadow-sm" strokeWidth={1.75} />
      </span>
      {goals.length > 0 && (
        <span aria-hidden="true" className="absolute bottom-[7%] left-[5%] flex gap-1.5">
          {goals.map((n) => (
            <span
              key={n}
              style={{ backgroundColor: SDGS[n]!.color }}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 font-heading text-xs leading-none font-extrabold shadow-sm ring-2 ring-white/70",
                SDGS[n]!.text === "light" ? "text-white" : "text-brand-night",
              )}
            >
              <span className="mr-0.5 text-[0.6rem] opacity-80">SDG</span>
              {n}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
