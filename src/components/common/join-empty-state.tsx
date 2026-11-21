import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "./empty-state";

/** The one friendly empty state used by list pages (news, events, gallery, members): club mark. */
export async function JoinEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const t = await getTranslations("Common");
  return (
    <EmptyState
      visual={<BrandLockup variant="mark" height={64} decorative />}
      title={title}
      description={description ?? t("emptyDescription")}
    >
      <Button asChild className="mt-2">
        <Link href="/join">{t("joinCta")}</Link>
      </Button>
    </EmptyState>
  );
}
