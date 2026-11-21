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
    <div
      className={cn(
        "relative isolate overflow-hidden border-b border-border/60 bg-linear-to-b from-surface-2 to-background",
        className,
      )}
    >
      <DecorativeShapes />
      <div className="container-page py-12 sm:py-16">
        <div className="max-w-3xl space-y-4">
          {eyebrow && (
            <Eyebrow color={eyebrowColor} className="animate-rise-in">
              {eyebrow}
            </Eyebrow>
          )}
          <h1 className="text-[clamp(2rem,1.5rem+2.4vw,3rem)] leading-[1.12] font-extrabold">
            {title}
          </h1>
          {description && <p className="text-lg text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
