import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { MemberCard } from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { listMembers } from "@/lib/data/members";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/members">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Members" });
  return pageMetadata({
    locale,
    path: "/members",
    title: t("metaTitle"),
    description: t("description"),
  });
}

export default async function MembersPage({ params }: PageProps<"/[locale]/members">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations();
  const { leadership, members, hiddenCount } = await listMembers(locale);
  const isEmpty = leadership.length === 0 && members.length === 0;

  return (
    <>
      <PageHero
        eyebrow={t("Members.eyebrow")}
        eyebrowColor="green"
        title={t("Members.title")}
        description={t("Members.description")}
      />
      {leadership.length > 0 && (
        <Section>
          <SectionHeading title={t("Members.leadership")} />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {leadership.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} size="large" />
            ))}
          </ul>
        </Section>
      )}
      {members.length > 0 && (
        <Section className="bg-muted/30">
          <SectionHeading
            title={t("Members.members")}
            description={t("Members.count", { count: leadership.length + members.length })}
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {members.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i + 2} />
            ))}
          </ul>
        </Section>
      )}
      {!isEmpty && hiddenCount > 0 && (
        <p className="container-page -mt-4 pb-6 text-center text-sm text-muted-foreground">
          {t("Members.hiddenNote")}
        </p>
      )}
      {isEmpty && (
        <Section className="pt-8 sm:pt-10">
          <JoinEmptyState icon={Users} title={t("Members.empty")} />
        </Section>
      )}
      {!isEmpty && (
        <Section>
          <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-brand-green-soft p-8 text-center sm:p-12">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("Members.joinTitle")}</h2>
            <p className="text-muted-foreground">{t("Members.joinBody")}</p>
            <Button asChild size="lg">
              <Link href="/join">{t("Common.joinCta")}</Link>
            </Button>
          </div>
        </Section>
      )}
    </>
  );
}
