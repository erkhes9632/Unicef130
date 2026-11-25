import { CalendarHeart, Clock, Coins, HeartHandshake, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { coverIconFor, coverIcons } from "@/components/common/cover-image";
import { InfoNote } from "@/components/common/info-note";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { StatTile } from "@/components/common/stat-tile";
import { ImpactTimeline, type TimelineItem } from "@/components/impact/impact-timeline";
import { SdgExplorer, type ExplorerGoal } from "@/components/impact/sdg-explorer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listYearActivities } from "@/lib/data/events";
import { displayYear, getImpactYear, listImpactYears, type ImpactRow } from "@/lib/data/impact";
import { getNewsSlugsForEvents } from "@/lib/data/news";
import { getHomeStats, getSiteSettings } from "@/lib/data/settings";
import { formatDate, formatDateRange, formatMnt, formatNumber } from "@/lib/dates/format";
import { SDGS } from "@/lib/sdg";
import { pageMetadata } from "@/lib/seo";
import { statKind } from "@/lib/stat-icon";
import { clubDirections } from "@/lib/types";
import { cn } from "@/lib/utils";

const directionColor: Record<string, { bar: string; soft: string; text: string }> = {
  activity: { bar: "bg-brand-cyan", soft: "bg-brand-cyan-soft", text: "text-brand-cyan-strong" },
  education: {
    bar: "bg-brand-purple",
    soft: "bg-brand-purple-soft",
    text: "text-brand-purple-strong",
  },
  charity: { bar: "bg-brand-gold", soft: "bg-brand-gold-soft", text: "text-brand-gold-strong" },
};

/** The requested school year, if it has numbers; otherwise the latest (null when none). */
async function resolveYear(requested: string | undefined) {
  const years = await listImpactYears();
  const year = requested && years.includes(requested) ? requested : (years[0] ?? null);
  return { years, year };
}

/** Shared by /impact (latest year) and /impact/[year] (cached pages, no query string). */
export async function impactMetadata(locale: Locale, requested?: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Impact" });
  const { year, years } = await resolveYear(requested);
  return pageMetadata({
    locale,
    path: year && year !== years[0] ? `/impact/${year}` : "/impact",
    title: year ? t("title", { year: displayYear(year) }) : t("metaTitle"),
    description: t("description"),
  });
}

/** Horizontal bars, one per direction (plain HTML/CSS, no chart library). */
function Bars({
  title,
  rows,
  value,
  label,
  directionLabel,
}: {
  title: string;
  rows: ImpactRow[];
  value: (r: ImpactRow) => number;
  label: (r: ImpactRow) => string;
  directionLabel: (d: string) => string;
}) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <figure className="reveal rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border sm:p-6">
      <figcaption className="mb-4 font-bold">{title}</figcaption>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.direction}>
            <dt className="mb-1 flex flex-wrap justify-between gap-x-2 text-sm">
              <span className="font-semibold">{directionLabel(r.direction)}</span>
              <span className="font-heading font-extrabold">{label(r)}</span>
            </dt>
            <dd aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-muted">
              <span
                className={cn("grow-x block h-full rounded-full", directionColor[r.direction]?.bar)}
                style={{ width: `${Math.max(2, (value(r) / max) * 100)}%` }}
              />
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

const STAT_ICONS = {
  money: Coins,
  hours: Clock,
  members: Users,
  reach: HeartHandshake,
  events: CalendarHeart,
  other: Sparkles,
} as const;

export async function ImpactView({ locale, requested }: { locale: Locale; requested?: string }) {
  const t = await getTranslations("Impact");
  const tn = await getTranslations("News");
  const { years, year } = await resolveYear(requested);
  if (requested && year !== requested) notFound();

  if (!year) {
    return (
      <>
        <PageHero eyebrow={t("eyebrow")} title={t("metaTitle")} description={t("description")} />
        <Section className="pt-8 sm:pt-10">
          <JoinEmptyState title={t("noData")} />
        </Section>
      </>
    );
  }

  const [impact, activities, settings] = await Promise.all([
    getImpactYear(year),
    listYearActivities(locale, year),
    getSiteSettings(),
  ]);
  const isLatest = year === years[0];
  // Headline stats come from site settings and describe the latest year only.
  const headline = isLatest
    ? await getHomeStats(locale, settings, {
        members: t("autoMembers"),
        events: t("autoActivities"),
      })
    : [];
  const newsSlugs = await getNewsSlugsForEvents(activities.map((a) => a.id));
  const directionLabel = (d: string) =>
    d === "total" ? t("total") : tn(`categories.${d as "activity"}`);
  const rows = impact?.directions ?? [];
  const sdgCounts = new Map<number, number>();
  for (const a of activities) for (const n of a.sdgs) sdgCounts.set(n, (sdgCounts.get(n) ?? 0) + 1);
  const sdgs = [...sdgCounts.keys()].sort((a, b) => a - b);
  const sdgName = (n: number) => (locale === "en" ? SDGS[n]!.en : SDGS[n]!.mn);
  const hrefOf = (a: (typeof activities)[number]) =>
    newsSlugs.has(a.id) ? `/news/${newsSlugs.get(a.id)}` : `/events/${a.slug}`;
  const explorerGoals: ExplorerGoal[] = Object.keys(SDGS)
    .map(Number)
    .map((n) => {
      const list = activities.filter((a) => a.sdgs.includes(n));
      return {
        n,
        name: sdgName(n),
        color: SDGS[n]!.color,
        light: SDGS[n]!.text === "light",
        countLabel: list.length ? t("sdgActivities", { count: list.length }) : "",
        activities: list.map((a) => ({ id: a.id, title: a.title, href: hrefOf(a) })),
      };
    });
  // Open the explorer on the goal with the most activities.
  const topSdg = [...sdgCounts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
  const timelineItems: TimelineItem[] = activities.map((a) => ({
    id: a.id,
    href: hrefOf(a),
    title: a.title,
    dateTime: a.startsAt,
    dateLabel: a.allDay
      ? formatDateRange(locale, a.startsAt, a.endsAt)
      : formatDate(locale, a.startsAt, "long"),
    monthKey: formatDate(locale, a.startsAt, "monthYear"),
    monthLabel: formatDate(locale, a.startsAt, "monthYear"),
    direction: a.direction,
    directionLabel: a.direction ? directionLabel(a.direction) : null,
    sdgs: a.sdgs
      .filter((n) => SDGS[n])
      .map((n) => ({
        n,
        label: sdgName(n),
        color: SDGS[n]!.color,
        light: SDGS[n]!.text === "light",
      })),
  }));
  const timelineFilters = clubDirections
    .map((d) => ({ key: d, n: activities.filter((a) => a.direction === d).length }))
    .filter((f) => f.n > 0)
    .map((f) => ({
      key: f.key,
      label: directionLabel(f.key),
      count: t("sdgActivities", { count: f.n }),
    }));

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        eyebrowColor="green"
        title={t("title", { year: displayYear(year) })}
        description={t("description")}
      />

      {years.length > 1 && (
        <nav aria-label={t("yearLabel")} className="container-page pt-6">
          <ul className="flex flex-wrap gap-2">
            {years.map((y) => (
              <li key={y}>
                <Link
                  href={y === years[0] ? "/impact" : `/impact/${y}`}
                  aria-current={y === year ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-border hover:bg-muted",
                    y === year && "bg-brand-green text-brand-ink ring-brand-green",
                  )}
                >
                  {displayYear(y)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {headline.length > 0 && (
        <Section className="pt-8 sm:pt-10">
          <h2 className="sr-only">{t("totalsTitle")}</h2>
          {/* Odd counts: the first tile spans two columns so rows end evenly (7 → 2 + 1×5). */}
          <ul
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              headline.length % 4 === 3 || headline.length === 4
                ? "lg:grid-cols-4"
                : "lg:grid-cols-3",
            )}
          >
            {headline.map((s, i) => {
              const wide =
                i === 0 &&
                (headline.length % 4 === 3 ||
                  headline.length % 3 === 2 ||
                  headline.length % 2 === 1);
              return (
                <li
                  key={`${s.label}-${i}`}
                  className={cn(
                    "rounded-3xl bg-card p-4 shadow-soft ring-1 ring-border sm:p-5",
                    wide && "sm:col-span-2",
                    i === 0 && "bg-brand-cyan-soft",
                  )}
                >
                  <StatTile
                    icon={STAT_ICONS[statKind(s.label, s.value)]}
                    value={s.value}
                    label={s.label}
                    tone={(["cyan", "purple", "green", "gold"] as const)[i % 4]}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {impact && rows.length > 0 && (
        <Section surface="tint">
          <SectionHeading title={t("directionsTitle")} description={t("directionsDescription")} />
          {/* Phones/tablets: one card per direction (no sideways scrolling). */}
          <ul className="reveal-group grid gap-3 sm:grid-cols-2 md:hidden">
            {[...rows, ...(impact.total ? [impact.total] : [])].map((r) => {
              const isTotal = r.direction === "total";
              const Icon = isTotal ? null : coverIcons[coverIconFor(r.direction)];
              const cells = [
                [t("activities"), String(r.activities)],
                [t("inPerson"), r.inPersonLabel],
                [t("online"), formatNumber(r.online)],
                [t("reachTotal"), formatNumber(r.total)],
                [t("donation"), r.donationAmount > 0 ? formatMnt(r.donationAmount) : "—"],
              ] as const;
              return (
                <li
                  key={r.direction}
                  className={cn(
                    "rounded-3xl bg-card p-4 shadow-soft ring-1 ring-border",
                    isTotal && "bg-muted",
                  )}
                >
                  <h3 className="mb-3 flex items-center gap-2 font-bold">
                    {Icon && (
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-xl",
                          directionColor[r.direction]?.soft,
                          directionColor[r.direction]?.text,
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    {directionLabel(r.direction)}
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {cells.map(([label, value]) => (
                      <div key={label} className="flex min-w-0 flex-col">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-heading font-extrabold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className="reveal hidden md:block">
            <table className="w-full overflow-hidden rounded-2xl bg-card text-sm shadow-soft ring-1 ring-border">
              <caption className="sr-only">{t("directionsTitle")}</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="p-3 sm:p-4">
                    {t("direction")}
                  </th>
                  <th scope="col" className="p-3 text-right sm:p-4">
                    {t("activities")}
                  </th>
                  <th scope="col" className="p-3 text-right sm:p-4">
                    {t("inPerson")}
                  </th>
                  <th scope="col" className="p-3 text-right sm:p-4">
                    {t("online")}
                  </th>
                  <th scope="col" className="p-3 text-right sm:p-4">
                    {t("reachTotal")}
                  </th>
                  <th scope="col" className="p-3 text-right sm:p-4">
                    {t("donation")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...rows, ...(impact.total ? [impact.total] : [])].map((r) => {
                  const isTotal = r.direction === "total";
                  const Icon = isTotal ? null : coverIcons[coverIconFor(r.direction)];
                  return (
                    <tr
                      key={r.direction}
                      className={cn("even:bg-muted/30", isTotal && "bg-muted font-bold")}
                    >
                      <th scope="row" className="p-3 text-left sm:p-4">
                        <span className="inline-flex items-center gap-2">
                          {Icon && (
                            <span
                              className={cn(
                                "flex size-8 items-center justify-center rounded-xl",
                                directionColor[r.direction]?.soft,
                                directionColor[r.direction]?.text,
                              )}
                            >
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                          )}
                          {isTotal ? (
                            directionLabel(r.direction)
                          ) : (
                            <Link
                              href={{ pathname: "/news", query: { category: r.direction } }}
                              className="inline-flex min-h-11 items-center hover:underline"
                            >
                              {directionLabel(r.direction)}
                            </Link>
                          )}
                        </span>
                      </th>
                      <td className="p-3 text-right tabular-nums sm:p-4">{r.activities}</td>
                      <td className="p-3 text-right tabular-nums sm:p-4">{r.inPersonLabel}</td>
                      <td className="p-3 text-right tabular-nums sm:p-4">
                        {formatNumber(r.online)}
                      </td>
                      <td className="p-3 text-right tabular-nums sm:p-4">
                        {formatNumber(r.total)}
                      </td>
                      <td className="p-3 text-right tabular-nums sm:p-4">
                        {r.donationAmount > 0 ? formatMnt(r.donationAmount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {impact.total &&
            impact.total.activities !== activities.length &&
            activities.length > 0 && (
              <InfoNote className="mt-3">
                {t("activitiesFootnote", {
                  reported: impact.total.activities,
                  listed: activities.length,
                })}
              </InfoNote>
            )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Bars
              title={t("chartInPerson")}
              rows={rows}
              value={(r) => r.inPerson}
              label={(r) => r.inPersonLabel}
              directionLabel={directionLabel}
            />
            <Bars
              title={t("chartOnline")}
              rows={rows}
              value={(r) => r.online}
              label={(r) => formatNumber(r.online)}
              directionLabel={directionLabel}
            />
          </div>
        </Section>
      )}

      {sdgs.length > 0 && (
        <Section surface="tint">
          <SectionHeading
            title={t("sdgTitle")}
            description={`${t("sdgReached", { count: sdgs.length })}. ${t("sdgPick")}.`}
          />
          <div className="reveal">
            <SdgExplorer
              goals={explorerGoals}
              initial={topSdg}
              labels={{
                pick: t("sdgPick"),
                none: t("sdgNone"),
                news: t("sdgNews"),
                activities: t("timelineTitle"),
              }}
            />
          </div>
        </Section>
      )}

      {activities.length > 0 && (
        <Section>
          <SectionHeading title={t("timelineTitle")} />
          <ImpactTimeline
            items={timelineItems}
            filters={timelineFilters}
            labels={{
              all: t("filterAll"),
              allCount: t("sdgActivities", { count: activities.length }),
              filter: t("filterLabel"),
              sdgs: t("sdgList"),
            }}
          />
        </Section>
      )}
    </>
  );
}
