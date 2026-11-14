import { cn } from "@/lib/utils";

/**
 * Soft, illustration-like background shapes in brand colors (purely decorative).
 * Motion is disabled automatically for prefers-reduced-motion (see globals.css).
 */
export function DecorativeShapes({
  variant = "default",
  className,
}: {
  variant?: "default" | "hero";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="absolute -top-24 -left-20 size-72 rounded-full bg-brand-cyan/15 blur-3xl" />
      <div className="absolute top-10 -right-16 size-64 rounded-full bg-brand-purple/15 blur-3xl" />
      {variant === "hero" && (
        <>
          <div className="absolute bottom-0 left-1/3 size-56 rounded-full bg-brand-gold/15 blur-3xl" />
          <svg
            viewBox="0 0 120 120"
            className="absolute top-6 right-[3%] hidden size-14 animate-float-soft text-brand-gold opacity-60 lg:block"
          >
            <path
              fill="currentColor"
              d="M60 8l13 33 35 2-27 22 9 34-30-19-30 19 9-34-27-22 35-2z"
              opacity="0.85"
            />
          </svg>
          <svg
            viewBox="0 0 100 100"
            className="absolute right-[2%] bottom-6 hidden size-12 animate-float-soft text-brand-green opacity-50 [animation-delay:-3s] lg:block"
          >
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12" />
          </svg>
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-8 left-[46%] hidden size-8 animate-float-soft text-brand-blue opacity-40 [animation-delay:-6s] xl:block"
          >
            <rect x="15" y="15" width="70" height="70" rx="20" fill="currentColor" opacity="0.7" />
          </svg>
        </>
      )}
    </div>
  );
}
