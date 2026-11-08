import { cn } from "@/lib/utils";

export function Section({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("py-14 sm:py-20", className)} {...props}>
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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase",
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
        "mb-8 flex flex-col gap-4 sm:mb-10",
        align === "center" && "items-center text-center",
        action && align === "left" && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto")}>
        {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
        <Heading className="text-3xl font-extrabold sm:text-4xl">{title}</Heading>
        {description && <p className="text-base text-muted-foreground sm:text-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
