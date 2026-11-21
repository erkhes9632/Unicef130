import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Muted explanatory note with an icon (data caveats, privacy notes). */
export function InfoNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
