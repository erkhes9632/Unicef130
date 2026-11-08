import { cn } from "@/lib/utils";
import { DecorativeShapes } from "./decorative-shapes";
import { Eyebrow, type BrandColor } from "./section";

/** Header block for inner pages (title + intro on a soft colorful background). */
export function PageHero({
  eyebrow,
  eyebrowColor = "cyan",
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  eyebrowColor?: BrandColor;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate border-b border-border/60", className)}>
      <DecorativeShapes />
      <div className="container-page py-12 sm:py-16">
        <div className="max-w-3xl animate-fade-up space-y-4">
          {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
          <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
          {description && <p className="text-lg text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
