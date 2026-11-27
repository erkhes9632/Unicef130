import { GraduationCap, HandHeart, type LucideIcon, Megaphone } from "lucide-react";
import { responsiveSrc } from "@/lib/media/variants";
import { cn } from "@/lib/utils";

export type CollagePhoto = { src: string; alt: string };

const PILLAR_TILES: { key: string; icon: LucideIcon; tone: string; dot: string }[] = [
  {
    key: "activity",
    icon: Megaphone,
    tone: "bg-brand-cyan-soft text-brand-cyan-strong",
    dot: "text-brand-cyan",
  },
  {
    key: "education",
    icon: GraduationCap,
    tone: "bg-brand-purple-soft text-brand-purple-strong",
    dot: "text-brand-purple",
  },
  {
    key: "charity",
    icon: HandHeart,
    tone: "bg-brand-gold-soft text-brand-gold-strong",
    dot: "text-brand-gold",
  },
];

const FRAMES = [
  // Tall frame on the left, two small ones stacked on the right; slight, deliberate tilts.
  "row-span-2 -rotate-2 min-h-56",
  "rotate-2 aspect-[4/3]",
  "-rotate-1 aspect-[4/3]",
];

/**
 * Home hero visual: three rounded frames. Real photos (hero image, gallery, news and event
 * covers — newest first) fill them as they are uploaded; until then each empty frame is a
 * pillar tile (tint, icon, pillar name, dot pattern). No stock photos, no invented people.
 */
export function HeroCollage({
  photos,
  pillarLabels,
}: {
  photos: CollagePhoto[];
  pillarLabels: Record<string, string>;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Two intentional shapes: a sun behind the top right, a coral blob bottom left. */}
      <span
        aria-hidden="true"
        className="absolute -top-6 -right-4 -z-10 size-40 rounded-full bg-brand-sun/45 sm:size-52"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-8 -left-6 -z-10 h-36 w-48 rounded-[45%_55%_60%_40%] bg-brand-coral/25"
      />
      <div className="grid grid-cols-[1.15fr_1fr] gap-3 sm:gap-4">
        {FRAMES.map((frame, i) => {
          const photo = photos[i];
          const tile = PILLAR_TILES[i]!;
          const Icon = tile.icon;
          return (
            <figure
              key={i}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-card p-1.5 shadow-lift ring-1 ring-border motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:rotate-0",
                frame,
              )}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- R2 image, pre-sized on upload
                <img
                  src={photo.src}
                  {...responsiveSrc(photo.src, "(min-width: 1024px) 22vw, 45vw")}
                  alt={photo.alt}
                  width={100}
                  height={100}
                  fetchPriority={i === 0 ? "high" : undefined}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="size-full rounded-xl object-cover dark:brightness-[.92]"
                />
              ) : (
                <div
                  className={cn(
                    "relative flex size-full flex-col justify-between overflow-hidden rounded-xl p-4 sm:p-5",
                    tile.tone,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 [background-image:radial-gradient(currentColor_1.2px,transparent_1.6px)] [mask-image:linear-gradient(160deg,transparent_30%,black_85%)] [background-size:16px_16px] opacity-25",
                      tile.dot,
                    )}
                  />
                  <span className="relative flex size-11 items-center justify-center rounded-2xl bg-card/80 shadow-soft sm:size-12">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <figcaption className="relative font-heading text-lg leading-tight font-extrabold sm:text-xl">
                    {pillarLabels[tile.key]}
                  </figcaption>
                </div>
              )}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
