import { ArrowRight, Check, HeartHandshake, Scale, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { MemberCard } from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getBranding } from "@/lib/branding";
import { listDirectionActivities } from "@/lib/data/events";
import { pick } from "@/lib/data/localize";
import { listTeamsByYear } from "@/lib/data/members";
import { getNewsSlugsForEvents } from "@/lib/data/news";
import { getCurrentSchoolYear, getSiteSettings, paragraphs } from "@/lib/data/settings";
import { pickShownTeam } from "@/lib/members/logic";
import { displayYear } from "@/lib/school-year";
import { pageMetadata } from "@/lib/seo";
import { clubDirections } from "@/lib/types";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "About" });
  const { about } = await getSiteSettings();
  return pageMetadata({
    locale,
    path: "/about",
    title: t("metaTitle"),
    description: pick(locale, about.intro, about.introEn) || undefined,
  });
}

const valueStyles = [
  { icon: HeartHandshake, tone: "bg-brand-cyan-soft text-brand-cyan-strong" },
  { icon: Scale, tone: "bg-brand-purple-soft text-brand-purple-strong" },
  { icon: Users, tone: "bg-brand-green-soft text-brand-green-strong" },
  { icon: Shield, tone: "bg-brand-gold-soft text-brand-gold-strong" },
] as const;

const directionStyles = {
  activity: { tone: "bg-brand-cyan-soft", check: "text-brand-cyan-strong" },
  education: { tone: "bg-brand-purple-soft", check: "text-brand-purple-strong" },
  charity: { tone: "bg-brand-gold-soft", check: "text-brand-gold-strong" },
} as const;

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("About");
  const tn = await getTranslations("News");
  const tc = await getTranslations("Common");
  const tm = await getTranslations("Members");
  const [teams, current, { about, club }, activities, branding] = await Promise.all([
    listTeamsByYear(locale),
    getCurrentSchoolYear(),
    getSiteSettings(),
    listDirectionActivities(locale),
    getBranding(locale),
  ]);
  // The current year's leaders, or the latest year's while the new team is not added yet.
  const { shown: team, waiting } = pickShownTeam(teams, current);
  const leadership = team?.leaders ?? [];
  const newsSlugs = await getNewsSlugsForEvents(activities.map((a) => a.id));
  const intro = pick(locale, about.intro, about.introEn);
  const mission = pick(locale, about.mission, about.missionEn);
  const history = about.historyPublished
    ? paragraphs(pick(locale, about.history, about.historyEn))
    : [];
  const values = about.values.map((v) => ({
    title: pick(locale, v.title, v.titleEn),
    body: pick(locale, v.body, v.bodyEn),
  }));
  // "What we do": the club's three directions, each listing its real activities.
  const columns = clubDirections
    .map((d) => ({
      key: d,
      title: tn(`categories.${d}`),
      body: t(`directions.${d}`),
      items: activities
        .filter((a) => a.direction === d)
        .map((a) => ({
          id: a.id,
          title: a.title,
          href: newsSlugs.has(a.id) ? `/news/${newsSlugs.get(a.id)}` : `/events/${a.slug}`,
        })),
      ...directionStyles[d],
    }))
    .filter((c) => c.items.length > 0);
  const hasStoryRow = history.length > 0 || club.foundedYear || mission;

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={intro || undefined} />

      {hasStoryRow && (
        <Section>
          <div
            className={cn(
              "grid gap-10 lg:items-start",
              history.length > 0 && "lg:grid-cols-[1.4fr_1fr]",
            )}
          >
            {history.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-3xl font-extrabold">{t("storyTitle")}</h2>
                {history.map((p, i) => (
                  <p key={i} className="text-lg text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            )}
            <div className={cn("grid gap-4", history.length === 0 && "sm:grid-cols-[auto_1fr]")}>
              {club.foundedYear && (
                <div className="flex items-center justify-between gap-4 rounded-3xl bg-brand-cyan p-6 text-brand-ink">
                  <div>
                    <p className="text-sm font-bold uppercase">{t("foundedLabel")}</p>
                    <p className="font-heading text-6xl font-extrabold">{club.foundedYear}</p>
                  </div>
                  {/* The school's own logo (admin upload): small, on this page only. */}
                  {branding.schoolLogo && (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin upload from R2
                    <img
                      src={branding.schoolLogo}
                      alt={tc("schoolLogoAlt")}
                      width={56}
                      height={56}
                      loading="lazy"
                      className="size-14 shrink-0 rounded-xl bg-white object-contain p-1"
                    />
                  )}
                </div>
              )}
              {mission && (
                <div className="rounded-3xl bg-brand-purple-soft p-6">
                  <h2 className="mb-2 text-xl font-extrabold">{t("missionTitle")}</h2>
                  <p>{mission}</p>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {values.length > 0 && (
        <Section surface="tint">
          <SectionHeading title={t("valuesTitle")} align="center" />
          <ul
            className={cn(
              "reveal-group grid gap-4 sm:grid-cols-2",
              values.length >= 4 ? "lg:grid-cols-4" : values.length === 3 && "lg:grid-cols-3",
            )}
          >
            {values.map((v, i) => {
              const { icon: Icon, tone } = valueStyles[i % valueStyles.length]!;
              return (
                <li key={i} className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
                  <span
                    className={cn(
                      "mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl",
                      tone,
                    )}
                  >
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold">{v.title}</h3>
                  {v.body && (
                    <p className="mt-1 text-base text-muted-foreground sm:text-sm">{v.body}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {columns.length > 0 && (
        <Section>
          <SectionHeading title={t("doTitle")} />
          <div className={cn("reveal-group grid gap-6", columns.length > 1 && "lg:grid-cols-3")}>
            {columns.map((col) => (
              <div key={col.key} className={cn("flex flex-col rounded-3xl p-6 sm:p-8", col.tone)}>
                <h3 className="text-2xl font-extrabold">{col.title}</h3>
                <p className="mt-2 mb-4 text-base text-muted-foreground sm:text-sm">{col.body}</p>
                <ul className="flex-1 space-y-3">
                  {col.items.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <Check
                        className={cn("mt-0.5 size-5 shrink-0", col.check)}
                        aria-hidden="true"
                      />
                      <Link
                        href={item.href}
                        className="inline-flex min-h-11 items-center font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={{ pathname: "/news", query: { category: col.key } }}
                  className={cn(
                    "mt-3 inline-flex min-h-11 items-center text-sm font-bold hover:underline",
                    col.check,
                  )}
                >
                  {t("directionAll", { direction: col.title })} →
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}

      {leadership.length > 0 && (
        <Section surface="tint">
          <SectionHeading
            title={
              team ? t("leadershipOfYear", { year: displayYear(team.year) }) : t("leadershipTitle")
            }
            description={
              waiting && team
                ? tm("teamSoon", { year: displayYear(waiting), shown: displayYear(team.year) })
                : t("leadershipDescription")
            }
            action={
              <Button asChild variant="outline">
                <Link href="/members">
                  {t("allMembers")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <ul className="reveal-group grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {leadership.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} anonymous={!m.name} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
