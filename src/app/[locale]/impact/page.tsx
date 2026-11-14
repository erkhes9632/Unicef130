import { ArrowRight, BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { coverIconFor, coverIcons } from "@/components/common/cover-image";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section, SectionHeading } from "@/components/common/section";
import { SdgBadges } from "@/components/impact/sdg-badges";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDate, formatDateRange, formatMnt, formatNumber } from "@/lib/dates/format";
import { listYearActivities } from "@/lib/data/events";
import { displayYear, getImpactYear, listImpactYears, type ImpactRow } from "@/lib/data/impact";
import { getNewsSlugsForEvents } from "@/lib/data/news";
import { getHomeStats, getSiteSettings } from "@/lib/data/settings";
import { SDGS } from "@/lib/sdg";
import { pageMetadata } from "@/lib/seo";
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

async function resolveYear(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const years = await listImpactYears();
  const requested = (await searchParams).year;
  const year =
    typeof requested === "string" && years.includes(requested) ? requested : (years[0] ?? null);
  return { years, year };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/impact">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Impact" });
  const { year } = await resolveYear(searchParams);
  return pageMetadata({
    locale,
    path: "/impact",
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
    <figure className="rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6">
      <figcaption className="mb-4 font-bold">{title}</figcaption>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.direction}>
            <dt className="mb-1 flex justify-between gap-2 text-sm">
              <span className="font-semibold">{directionLabel(r.direction)}</span>
              <span className="font-heading font-extrabold">{label(r)}</span>
            </dt>
            <dd aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", directionColor[r.direction]?.bar)}
                style={{ width: `${Math.max(2, (value(r) / max) * 100)}%` }}
              />
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

export default async function ImpactPage({ params, searchParams }: PageProps<"/[locale]/impact">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Impact");
  const tn = await getTranslations("News");
  const { years, year } = await resolveYear(searchParams);

  if (!year) {
    return (
      <>
        <PageHero eyebrow={t("eyebrow")} title={t("metaTitle")} description={t("description")} />
        <Section className="pt-8 sm:pt-10">
          <JoinEmptyState icon={BarChart3} title={t("noData")} />
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
                  href={{ pathname: "/impact", query: y === years[0] ? {} : { year: y } }}
                  aria-current={y === year ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-border hover:bg-muted",
                    y === year && "bg-brand-green text-brand-night ring-brand-green",
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
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {headline.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                className="flex flex-col rounded-3xl bg-card p-5 text-center ring-1 ring-border"
              >
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="order-first font-heading text-3xl font-extrabold text-brand-cyan-strong sm:text-4xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {impact && rows.length > 0 && (
        <Section className="bg-muted/30">
          <SectionHeading title={t("directionsTitle")} description={t("directionsDescription")} />
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[40rem] overflow-hidden rounded-2xl bg-card text-sm ring-1 ring-border">
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
                    <tr key={r.direction} className={cn(isTotal && "bg-muted/40 font-bold")}>
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
                              className="hover:underline"
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

      {activities.length > 0 && (
        <Section>
          <SectionHeading title={t("timelineTitle")} />
          <ol className="relative space-y-4 border-l-2 border-border pl-6 sm:pl-8">
            {activities.map((a) => {
              const href = newsSlugs.has(a.id)
                ? `/news/${newsSlugs.get(a.id)}`
                : `/events/${a.slug}`;
              const color = a.direction ? directionColor[a.direction] : undefined;
              return (
                <li key={a.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-5 -left-[calc(1.5rem+7px)] size-3 rounded-full ring-4 ring-background sm:-left-[calc(2rem+7px)]",
                      color?.bar ?? "bg-brand-cyan",
                    )}
                  />
                  <article className="group relative rounded-2xl bg-card p-4 ring-1 ring-border transition-shadow hover:shadow-md sm:p-5">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={a.startsAt}>
                        {a.allDay
                          ? formatDateRange(locale, a.startsAt, a.endsAt)
                          : formatDate(locale, a.startsAt, "long")}
                      </time>
                      {a.direction && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold",
                            color?.soft,
                            color?.text,
                          )}
                        >
                          {directionLabel(a.direction)}
                        </span>
                      )}
                    </p>
                    <h3 className="mt-1 font-bold sm:text-lg">
                      <Link
                        href={href}
                        className="after:absolute after:inset-0 hover:text-brand-cyan-strong"
                      >
                        {a.title}
                      </Link>
                    </h3>
                    {a.sdgs.length > 0 && (
                      <div className="relative z-10 mt-2">
                        <SdgBadges sdgs={a.sdgs} size="sm" />
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      {sdgs.length > 0 && (
        <Section className="bg-muted/30">
          <SectionHeading title={t("sdgTitle")} description={t("sdgDescription")} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sdgs.map((n) => {
              const info = SDGS[n]!;
              return (
                <li key={n}>
                  <Link
                    href={{ pathname: "/news", query: { sdg: String(n) } }}
                    style={{ backgroundColor: info.color }}
                    className={cn(
                      "flex h-full flex-col gap-1 rounded-2xl p-4 transition-opacity hover:opacity-90",
                      info.text === "light" ? "text-white" : "text-brand-night",
                    )}
                  >
                    <span className="font-heading text-2xl font-extrabold">SDG {n}</span>
                    <span className="font-semibold">{locale === "en" ? info.en : info.mn}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm">
                      {t("sdgActivities", { count: sdgCounts.get(n) ?? 0 })}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
