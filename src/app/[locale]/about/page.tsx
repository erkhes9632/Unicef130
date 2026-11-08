import { ArrowRight, Check, HeartHandshake, Scale, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { MemberCard } from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { listMembers } from "@/lib/data/members";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "About" });
  return pageMetadata({ locale, path: "/about", title: t("metaTitle"), description: t("intro") });
}

const values = [
  { key: "care", icon: HeartHandshake, tone: "bg-brand-cyan-soft text-brand-cyan-strong" },
  { key: "equality", icon: Scale, tone: "bg-brand-purple-soft text-brand-purple-strong" },
  { key: "teamwork", icon: Users, tone: "bg-brand-green-soft text-brand-green-strong" },
  { key: "trust", icon: Shield, tone: "bg-brand-gold-soft text-brand-gold-strong" },
] as const;

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("About");
  const { leadership } = await listMembers(locale);
  const inside = t.raw("inside") as string[];
  const outside = t.raw("outside") as string[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold">{t("storyTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("story1")}</p>
            <p className="text-lg text-muted-foreground">{t("story2")}</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-brand-cyan p-6 text-brand-night">
              <p className="text-sm font-bold uppercase">{t("foundedLabel")}</p>
              <p className="font-heading text-6xl font-extrabold">{siteConfig.foundedYear}</p>
            </div>
            <div className="rounded-3xl bg-brand-purple-soft p-6">
              <h2 className="mb-2 text-xl font-extrabold">{t("missionTitle")}</h2>
              <p>{t("mission")}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="bg-muted/30">
        <SectionHeading title={t("valuesTitle")} align="center" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ key, icon: Icon, tone }) => (
            <li key={key} className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
              <span
                className={cn(
                  "mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl",
                  tone,
                )}
              >
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold">{t(`values.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`values.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading title={t("doTitle")} />
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: t("insideTitle"),
              items: inside,
              tone: "bg-brand-cyan-soft",
              check: "text-brand-cyan-strong",
            },
            {
              title: t("outsideTitle"),
              items: outside,
              tone: "bg-brand-green-soft",
              check: "text-brand-green-strong",
            },
          ].map((col) => (
            <div key={col.title} className={cn("rounded-3xl p-6 sm:p-8", col.tone)}>
              <h3 className="mb-4 text-2xl font-extrabold">{col.title}</h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className={cn("mt-0.5 size-5 shrink-0", col.check)} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {leadership.length > 0 && (
        <Section className="bg-muted/30">
          <SectionHeading
            title={t("leadershipTitle")}
            description={t("leadershipDescription")}
            action={
              <Button asChild variant="outline">
                <Link href="/members">
                  {t("allMembers")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {leadership.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
