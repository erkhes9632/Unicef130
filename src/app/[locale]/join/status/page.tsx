import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { FormsUnavailable } from "@/components/forms/forms-unavailable";
import { StatusLookupForm } from "@/components/forms/status-lookup-form";
import { resolveLocale } from "@/i18n/locale";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/join/status">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "JoinStatus" });
  return pageMetadata({
    locale,
    path: "/join/status",
    title: t("metaTitle"),
    description: t("description"),
    noIndex: true,
  });
}

export default async function JoinStatusPage({ params }: PageProps<"/[locale]/join/status">) {
  await resolveLocale(params);
  const [t, turnstileSiteKey] = await Promise.all([
    getTranslations("JoinStatus"),
    getTurnstileSiteKey(),
  ]);
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="container-page max-w-xl py-10 sm:py-14">
        <div className="rounded-[2rem] bg-card p-5 ring-1 ring-border sm:p-8">
          {turnstileSiteKey ? (
            <StatusLookupForm turnstileSiteKey={turnstileSiteKey} />
          ) : (
            <FormsUnavailable />
          )}
        </div>
      </div>
    </>
  );
}
