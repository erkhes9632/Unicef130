import { cn } from "@/lib/utils";

/**
 * Two soft, intentional shapes behind a page header: a sun circle (top right, partly off the
 * edge) and a coral blob. No blur, no dot grid; both themes via the accent tokens.
 */
export function DecorativeShapes({ variant = "default" }: { variant?: "default" | "hero" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span
        className={cn(
          "absolute rounded-full bg-brand-sun/30",
          variant === "hero" ? "-top-24 -right-20 size-80" : "-top-20 -right-16 size-56 sm:size-72",
        )}
      />
      <span className="absolute -bottom-16 left-[8%] h-28 w-44 rounded-[45%_55%_60%_40%] bg-brand-coral/15" />
    </div>
  );
}

const ribbonColors = [
  "bg-brand-cyan",
  "bg-brand-purple",
  "bg-brand-sun",
  "bg-brand-coral",
  "bg-brand-green",
] as const;

/** The club's five-colour ribbon (the recurring brand accent). Decorative. */
export function ColorRibbon({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex gap-1.5", className)}>
      {ribbonColors.map((c) => (
        <span key={c} className={cn("h-2 w-8 rounded-full", c)} />
      ))}
    </div>
  );
}

/** Highlighted word in a headline: brand colour + a hand-drawn ribbon stroke underneath. */
export function HeroHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap text-brand-cyan-strong">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 300 24"
        preserveAspectRatio="none"
        className="absolute -bottom-[0.18em] left-0 h-[0.28em] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="hero-ribbon" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--brand-cyan)" />
            <stop offset="0.5" stopColor="var(--brand-purple)" />
            <stop offset="1" stopColor="var(--brand-gold)" />
          </linearGradient>
        </defs>
        <path
          d="M5 16 C 70 5, 140 4, 200 10 S 275 19, 295 8"
          pathLength={1}
          fill="none"
          stroke="url(#hero-ribbon)"
          strokeWidth={7}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="animate-draw-stroke"
        />
      </svg>
    </span>
  );
}
