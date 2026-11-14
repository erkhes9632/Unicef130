import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "./empty-state";

/** The one friendly empty state used by list pages (news, events, gallery, members). */
export async function JoinEmptyState({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  const t = await getTranslations("Common");
  return (
    <EmptyState icon={icon} title={title} description={description ?? t("emptyDescription")}>
      <Button asChild className="mt-2">
        <Link href="/join">{t("joinCta")}</Link>
      </Button>
    </EmptyState>
  );
}
