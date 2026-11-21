import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  visual,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  /** Replaces the icon tile (e.g. the club mark). */
  visual?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {visual}
      {!visual && Icon && (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-cyan-soft text-brand-cyan-strong">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      )}
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
