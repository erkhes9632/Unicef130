import {
  ArrowRight,
  CalendarHeart,
  ChevronDown,
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
import { getLatestImpact, getReportMembership } from "@/lib/data/impact";
import { listTeamsByYear, type YearTeam } from "@/lib/data/members";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { formatNumber } from "@/lib/dates/format";
import { pickShownTeam } from "@/lib/members/logic";
import { displayYear } from "@/lib/school-year";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** Shared by /members and /members/[year] (an earlier year on top; cached pages). */
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

type T = Awaited<ReturnType<typeof getTranslations<"Members">>>;

/** "Удирдлага 5 · Гишүүн 52 · Сайн дурын цаг 734" (aggregates only, never per person). */
function TeamCounts({ team, t }: { team: YearTeam; t: T }) {
  const items = [
    { label: t("countLeaders"), value: team.leaderCount },
    { label: t("countMembers"), value: team.memberCount },
    { label: t("countHours"), value: team.hours },
  ].filter((i) => i.value > 0);
  if (items.length === 0) return null;
  return (
    <dl
      aria-label={t("countsLabel", { year: displayYear(team.year) })}
      className="flex flex-wrap gap-2 text-sm"
    >
      {items.map((i) => (
        <div
          key={i.label}
          className="inline-flex items-baseline gap-1.5 rounded-full bg-card px-4 py-2 ring-1 ring-border"
        >
          <dt className="text-muted-foreground">{i.label}</dt>
          <dd className="font-heading font-extrabold">{formatNumber(i.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Public member names of a year (consent only) + how many are not shown. */
function MemberNames({ team, t }: { team: YearTeam; t: T }) {
  if (team.members.length === 0) return null;
  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {team.members.map((m) => (
          <li
            key={m.id}
            className="rounded-full bg-brand-green-soft px-4 py-2 font-semibold text-foreground"
          >
            {m.name}
          </li>
        ))}
      </ul>
      {team.hiddenCount > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("hiddenMembers", { count: team.hiddenCount })}
        </p>
      )}
    </>
  );
}

/**
 * Who we are, without exposing students: the official numbers, what members do (the three
 * pillars), the current school year's team (leaders, then public names, then counts), earlier
 * years collapsed below («Өмнөх жилүүд»), and how to join. Until the current year has a team,
 * the latest year that has one is shown with its own label and a "coming soon" note. Names
 * appear only where an admin confirmed consent for that year.
 */
export async function MembersView({ locale, requested }: { locale: Locale; requested?: string }) {
  const t = await getTranslations();
  const tm = await getTranslations("Members");
  const [teams, current, impact, official] = await Promise.all([
    listTeamsByYear(locale),
    getCurrentSchoolYear(),
    getLatestImpact().catch(() => null),
    getReportMembership(),
  ]);
  const { shown, waiting, earlier } = pickShownTeam(teams, current, requested);
  if (requested && !shown) notFound();
  // The annual report's figure, not a count of database rows (website accounts differ).
  const activeShown = official?.active || (shown?.memberCount ?? 0);
  const isEmpty = !shown;

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

      {shown && (
        <Section surface="tint">
          {/* Plain heading (no scroll reveal): this block is often in the first viewport. */}
          <h2 className="mb-8 text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] leading-[1.15] font-extrabold sm:mb-10">
            {t("Members.leadershipOfYear", { year: displayYear(shown.year) })}
          </h2>
          {waiting && (
            <InfoNote className="-mt-4 mb-6">
              {t("Members.teamSoon", {
                year: displayYear(waiting),
                shown: displayYear(shown.year),
              })}
            </InfoNote>
          )}
          {shown.leaders.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {shown.leaders.map((m, i) => (
                <MemberCard key={m.id} member={m} index={i} size="large" anonymous={!m.name} />
              ))}
            </ul>
          )}
          {shown.leaders.some((m) => !m.name) && (
            <InfoNote className="mt-6">{t("Members.namesHiddenNote")}</InfoNote>
          )}
          {shown.members.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 text-xl font-extrabold">
                {t("Members.membersOfYear", { year: displayYear(shown.year) })}
              </h3>
              <MemberNames team={shown} t={tm} />
            </div>
          )}
          <div className="mt-8">
            <TeamCounts team={shown} t={tm} />
          </div>
        </Section>
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

      {earlier.length > 0 && (
        <Section surface="tint">
          <SectionHeading title={t("Members.earlierYears")} />
          <div className="space-y-3">
            {earlier.map((team) => (
              <details
                key={team.year}
                id={`year-${team.year}`}
                className="group rounded-3xl bg-card shadow-soft ring-1 ring-border"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-heading text-lg font-extrabold [&::-webkit-details-marker]:hidden">
                  {t("SchoolYear.heading", { year: displayYear(team.year) })}
                  <ChevronDown
                    className="size-5 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="space-y-6 px-5 pb-6">
                  {team.leaders.length > 0 && (
                    <div>
                      <h3 className="mb-3 font-bold">
                        {t("Members.leadershipOfYear", { year: displayYear(team.year) })}
                      </h3>
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {team.leaders.map((m, i) => (
                          <MemberCard key={m.id} member={m} index={i} anonymous={!m.name} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {team.members.length > 0 && (
                    <div>
                      <h3 className="mb-3 font-bold">
                        {t("Members.membersOfYear", { year: displayYear(team.year) })}
                      </h3>
                      <MemberNames team={team} t={tm} />
                    </div>
                  )}
                  <TeamCounts team={team} t={tm} />
                </div>
              </details>
            ))}
          </div>
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
