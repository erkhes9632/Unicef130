import {
  CalendarHeart,
  HandHeart,
  Heart,
  type LucideIcon,
  Megaphone,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  cyan: "from-brand-cyan/80 to-brand-blue/70",
  purple: "from-brand-purple/80 to-brand-blue/60",
  green: "from-brand-green/80 to-brand-cyan/60",
  gold: "from-brand-gold/85 to-brand-green/60",
  blue: "from-brand-blue/80 to-brand-purple/60",
} as const;
export type CoverTone = keyof typeof tones;

export const coverIcons = {
  activity: Sparkles,
  volunteering: HandHeart,
  rights: Scale,
  charity: Heart,
  announcement: Megaphone,
  event: CalendarHeart,
  members: Users,
} satisfies Record<string, LucideIcon>;

/**
 * Cover image with a friendly gradient placeholder (brand colors + icon) when no photo exists.
 * Always fills its parent; the parent sets the aspect ratio.
 */
export function CoverImage({
  src,
  alt,
  tone = "cyan",
  icon = "activity",
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  tone?: CoverTone;
  icon?: keyof typeof coverIcons;
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
        className="absolute -top-6 -left-6 size-24 rounded-full bg-white/20"
      />
      <span
        aria-hidden="true"
        className="absolute -right-8 -bottom-10 size-32 rounded-full bg-white/15"
      />
      <Icon
        aria-hidden="true"
        className="relative size-12 text-white drop-shadow-sm"
        strokeWidth={1.75}
      />
    </div>
  );
}

export const categoryTone: Record<string, CoverTone> = {
  activity: "cyan",
  volunteering: "green",
  rights: "purple",
  charity: "gold",
  announcement: "blue",
};
