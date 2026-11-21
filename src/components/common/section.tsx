import { cn } from "@/lib/utils";

const surfaces = {
  base: "",
  tint: "bg-surface-2",
  card: "border-y bg-card",
} as const;

/**
 * Page section with the standard vertical rhythm. `surface` alternates the background so
 * consecutive sections don't run together: base (page), tint (cream / charcoal band), card.
 */
export function Section({
  className,
  children,
  surface = "base",
  ...props
}: React.ComponentProps<"section"> & { surface?: keyof typeof surfaces }) {
  return (
    <section className={cn("py-[clamp(3rem,8vw,6rem)]", surfaces[surface], className)} {...props}>
      <div className="container-page">{children}</div>
    </section>
  );
}

const eyebrowColors = {
  cyan: "text-brand-cyan-strong bg-brand-cyan-soft",
  purple: "text-brand-purple-strong bg-brand-purple-soft",
  green: "text-brand-green-strong bg-brand-green-soft",
  blue: "text-brand-blue-strong bg-brand-blue-soft",
  gold: "text-brand-gold-strong bg-brand-gold-soft",
  coral: "text-brand-coral-strong bg-brand-coral-soft",
} as const;

export type BrandColor = keyof typeof eyebrowColors;

export function Eyebrow({
  color = "cyan",
  className,
  children,
}: {
  color?: BrandColor;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-[0.08em] uppercase",
        eyebrowColors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  eyebrowColor,
  title,
  description,
  action,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  eyebrowColor?: BrandColor;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "reveal mb-8 flex flex-col gap-4 sm:mb-10",
        align === "center" && "items-center text-center",
        action && align === "left" && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto")}>
        {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
        <Heading className="text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] leading-[1.15] font-extrabold">
          {title}
        </Heading>
        {description && <p className="text-base text-muted-foreground sm:text-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
