import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { EmptyState } from "./empty-state";
import { JoinCtaButton } from "./join-cta-button";

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
      <JoinCtaButton label={t("joinCta")} className="mt-2" />
    </EmptyState>
  );
}
