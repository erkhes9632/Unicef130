import {
  ArrowRight,
  CalendarHeart,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Megaphone,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InfoNote } from "@/components/common/info-note";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { StatTile } from "@/components/common/stat-tile";
import { MemberCard } from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { displayYear, getLatestImpact, getReportMembership } from "@/lib/data/impact";
import { listMembers } from "@/lib/data/members";
import { formatNumber } from "@/lib/dates/format";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** Shared by /members and /members/[year] (leadership of an earlier year; cached pages). */
export async function membersMetadata(locale: Locale, year?: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Members" });
  return pageMetadata({
    locale,
    path: year ? `/members/${year}` : "/members",
    title: t("metaTitle"),
    description: t("description"),
  });
}

const pillars = [
  { key: "activity", icon: Megaphone, tone: "bg-brand-cyan-soft text-brand-cyan-strong" },
  { key: "education", icon: GraduationCap, tone: "bg-brand-purple-soft text-brand-purple-strong" },
  { key: "charity", icon: HandHeart, tone: "bg-brand-gold-soft text-brand-gold-strong" },
] as const;

/**
 * Who we are, without exposing students: the official numbers, what members do (the three
 * pillars), the leadership (a name only where an admin confirmed consent) and how to join.
 * Members' names appear only for rows marked «Нийтэд харуулах» (a plain list, no photos).
 */
export async function MembersView({ locale, requested }: { locale: Locale; requested?: string }) {
  const t = await getTranslations();
  const [{ leadership, leadershipYear, leadershipYears, members, activeCount }, impact, official] =
    await Promise.all([
      listMembers(locale, { leadershipYear: requested }),
      getLatestImpact().catch(() => null),
      getReportMembership(),
    ]);
  if (requested && leadershipYear !== requested) notFound();
  // The annual report's figure, not a count of database rows (website accounts differ).
  const activeShown = official?.active || activeCount;
  const isEmpty = activeShown === 0 && leadership.length === 0;

  const stats = [
    ...(activeShown > 0
      ? [{ icon: Users, value: formatNumber(activeShown), label: t("Members.statMembers") }]
      : []),
    ...(impact?.total
      ? [
          {
            icon: CalendarHeart,
            value: formatNumber(impact.total.activities),
            label: t("Impact.activities"),
          },
          {
            icon: HeartHandshake,
            value: formatNumber(impact.total.total),
            label: t("Impact.reachTotal"),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHero
        eyebrow={t("Members.eyebrow")}
        eyebrowColor="green"
        title={t("Members.title")}
        description={t("Members.description")}
      />

      {stats.length > 0 && (
        <section aria-labelledby="members-stats" className="border-b bg-card">
          <div className="container-page py-8">
            <h2 id="members-stats" className="sr-only">
              {t("Members.statsTitle")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((s, i) => (
                <StatTile
                  key={s.label}
                  icon={s.icon}
                  value={s.value}
                  label={s.label}
                  tone={(["green", "cyan", "purple"] as const)[i % 3]}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <Section>
        <SectionHeading
          eyebrow={t("Home.whatEyebrow")}
          eyebrowColor="purple"
          title={t("Members.whatTitle")}
        />
        <ul className="reveal-group grid gap-4 md:grid-cols-3">
          {pillars.map(({ key, icon: Icon, tone }) => (
            <li key={key} className="rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border">
              <span
                className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl", tone)}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mb-2 text-lg font-bold">{t(`News.categories.${key}`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`About.directions.${key}`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {leadership.length > 0 && (
        <Section surface="tint">
          <SectionHeading
            title={
              leadershipYear
                ? t("Members.leadershipOfYear", { year: displayYear(leadershipYear) })
                : t("Members.leadership")
            }
          />
          {leadershipYears.length > 1 && (
            <nav aria-label={t("Members.otherYears")} className="-mt-4 mb-6">
              <ul className="flex flex-wrap gap-2 text-sm">
                {leadershipYears.map((y) => (
                  <li key={y}>
                    <Link
                      href={y === leadershipYears[0] ? "/members" : `/members/${y}`}
                      aria-current={y === leadershipYear ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full px-4 font-semibold ring-1 ring-border hover:bg-muted",
                        y === leadershipYear && "bg-brand-green-soft",
                      )}
                    >
                      {displayYear(y)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <ul className="reveal-group grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {leadership.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} size="large" anonymous={!m.name} />
            ))}
          </ul>
          {leadership.some((m) => !m.name) && (
            <InfoNote className="mt-6">{t("Members.namesHiddenNote")}</InfoNote>
          )}
        </Section>
      )}

      {members.length > 0 && (
        <Section>
          <SectionHeading title={t("Members.ourMembers")} />
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="rounded-full bg-brand-green-soft px-4 py-2 font-semibold text-foreground"
              >
                {m.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isEmpty ? (
        <Section className="pt-8 sm:pt-10">
          <JoinEmptyState title={t("Members.empty")} />
        </Section>
      ) : (
        <Section>
          <div className="relative isolate flex flex-col items-center gap-4 overflow-hidden rounded-[2rem] bg-brand-green-soft p-8 text-center ring-1 ring-border sm:p-12">
            <span
              aria-hidden="true"
              className="absolute -top-16 -right-12 -z-10 size-48 rounded-full bg-brand-sun/30"
            />
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("Members.joinTitle")}</h2>
            <p className="text-muted-foreground">{t("Members.joinBody")}</p>
            <Button asChild size="lg">
              <Link href="/join">
                {t("Common.joinCta")} <ArrowRight />
              </Link>
            </Button>
          </div>
        </Section>
      )}
    </>
  );
}
