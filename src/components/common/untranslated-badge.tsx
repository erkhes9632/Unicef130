import { Languages } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * English pages: content that has no English version yet is shown in Mongolian with this badge
 * (never an empty card or a raw key). Rule documented in README → Дизайн систем.
 */
export async function UntranslatedBadge({ className }: { className?: string }) {
  const t = await getTranslations("Common");
  return (
    <span
      lang="en"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Languages className="size-3.5" aria-hidden="true" />
      {t("untranslated")}
    </span>
  );
}
