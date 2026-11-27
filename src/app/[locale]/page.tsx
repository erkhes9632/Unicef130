import {
  ArrowRight,
  BarChart3,
  CalendarHeart,
  Clock,
  Coins,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SocialLinks } from "@/components/brand/social-links";
import { CountUp } from "@/components/common/count-up";
import { ColorRibbon, HeroHighlight } from "@/components/common/decorative-shapes";
import { PartnerChip } from "@/components/common/partner-chip";
import { Eyebrow, Section, SectionHeading } from "@/components/common/section";
import { StatTile } from "@/components/common/stat-tile";
import { DateBadge } from "@/components/events/date-badge";
import { EventCard } from "@/components/events/event-card";
import { HeroCollage } from "@/components/home/hero-collage";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getBranding } from "@/lib/branding";
import { getUpcomingEvents, listYearActivities } from "@/lib/data/events";
import { getGalleryPreview } from "@/lib/data/gallery";
import { getLatestImpact } from "@/lib/data/impact";
import { pick } from "@/lib/data/localize";
import { getLatestNews } from "@/lib/data/news";
import { getHomeStats, getSiteSettings, safeExternalUrl, safeImageUrl } from "@/lib/data/settings";
import { formatNumber } from "@/lib/dates/format";
import { displayYear } from "@/lib/school-year";
import { pageMetadata } from "@/lib/seo";
import { statKind } from "@/lib/stat-icon";
import { cn } from "@/lib/utils";

const pillars = [
  {
    key: "activity",
    icon: Megaphone,
    tone: "bg-card text-brand-cyan-strong",
    bar: "bg-brand-cyan",
    card: "bg-brand-cyan-soft",
  },
  {
    key: "education",
    icon: GraduationCap,
    tone: "bg-card text-brand-purple-strong",
    bar: "bg-brand-purple",
    card: "bg-brand-purple-soft",
  },
  {
    key: "charity",
    icon: HandHeart,
    tone: "bg-card text-brand-gold-strong",
    bar: "bg-brand-gold",
    card: "bg-brand-gold-soft",
  },
] as const;

const STAT_ICONS = {
  money: Coins,
  hours: Clock,
  members: Users,
  reach: HeartHandshake,
  events: CalendarHeart,
  other: Sparkles,
} as const;
const STAT_TONES = ["cyan", "purple", "green", "gold"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return pageMetadata({ locale, path: "/", description: t("description") });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations();
  const [news, events, gallery, settings, branding, impact] = await Promise.all([
    getLatestNews(locale, 3),
    getUpcomingEvents(locale, 3),
    getGalleryPreview(locale, 5),
    getSiteSettings(),
    getBranding(locale),
    getLatestImpact().catch(() => null),
  ]);
  const stats = await getHomeStats(
    locale,
    settings,
    { members: t("Home.stats.members"), events: t("Home.stats.events") },
    { featuredOnly: true },
  );
  // The band below the stats row shows other figures than the row (no number twice): the
  // number of activities, the goals they served and, when the row doesn't show it, online reach.
  const yearActivities = impact ? await listYearActivities(locale, impact.schoolYear) : [];
  const sdgCount = new Set(yearActivities.flatMap((a) => a.sdgs)).size;
  const shownValues = new Set(stats.map((s) => s.value.replace(/\s/g, "")));
  const socials = settings.socials;
  const partners = settings.partners.map((p) => ({
    name: pick(locale, p.name, p.nameEn),
    logo: safeImageUrl(p.logoUrl),
    url: safeExternalUrl(p.url),
    beneficiary: p.type === "beneficiary",
  }));
  const clubName = pick(locale, settings.club.name, settings.club.nameEn) || t("Common.clubName");
  const founded = settings.club.foundedYear;
  const nextEvent = events[0];
  // Hero collage: newest real images first (admin hero image, gallery, news, events).
  const collage = [
    ...(branding.heroImage
      ? [{ src: branding.heroImage.src, alt: branding.heroImage.alt || clubName }]
      : []),
    ...gallery.map((img) => ({ src: img.thumbUrl, alt: img.alt })),
    ...news.flatMap((n) => (n.coverUrl ? [{ src: n.coverUrl, alt: n.title }] : [])),
    ...events.flatMap((e) => (e.coverUrl ? [{ src: e.coverUrl, alt: e.title }] : [])),
  ]
    // Only uploaded photos (R2 or an https URL), never bundled placeholder art.
    .filter((p) => p.src.startsWith("/media/") || p.src.startsWith("https://"))
    .slice(0, 3);
  // One tall tile + a 2×2 block only works with exactly five photos; otherwise an even grid.
  const bigFirst = gallery.length === 5;

  return (
    <>
      {/* Hero: headline + the collage (real photos as they are uploaded, pillar tiles until then) */}
      <section className="relative isolate overflow-hidden bg-linear-to-b from-surface-2 to-background">
        <div className="container-page grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20 xl:gap-16">
          <div className="space-y-6">
            <Eyebrow className="animate-rise-in">
              {founded ? t("Home.heroEyebrow", { year: founded }) : t("Home.heroEyebrowNoYear")}
            </Eyebrow>
            <h1 className="text-[clamp(2.4rem,1.6rem+4vw,4.1rem)] leading-[1.08] font-extrabold">
              {t.rich("Home.heroTitle", {
                hl: (chunks) => <HeroHighlight>{chunks}</HeroHighlight>,
              })}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground sm:text-xl/relaxed">
              {t("Home.heroBody")}
            </p>
            <div className="flex animate-rise-in flex-col gap-3 [animation-delay:120ms] sm:flex-row">
              <Button asChild size="lg">
                <Link href="/join">
                  {t("Common.joinCta")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">{t("Home.heroSecondary")}</Link>
              </Button>
            </div>
            {nextEvent && (
              <Link
                href={`/events/${nextEvent.slug}`}
                className="group inline-flex max-w-full hover-lift items-center gap-3 rounded-2xl bg-card p-2.5 pr-4 shadow-soft ring-1 ring-border"
              >
                <DateBadge date={nextEvent.startsAt} className="w-14 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-brand-cyan-strong">
                    {t("Home.nextEvent")}
                  </span>
                  <span className="line-clamp-2 text-sm leading-snug font-bold group-hover:underline">
                    {nextEvent.title}
                  </span>
                </span>
              </Link>
            )}
          </div>
          <div className="animate-rise-in [animation-delay:200ms]">
            <HeroCollage
              photos={collage}
              pillarLabels={Object.fromEntries(
                pillars.map((p) => [p.key, t(`News.categories.${p.key}`)]),
              )}
            />
          </div>
        </div>
      </section>

      {/* Stats (admin → Сайтын тохиргоо; hidden when none are set) */}
      {stats.length > 0 && (
        <section aria-labelledby="stats-title" className="border-y bg-card">
          <div className="container-page py-8 sm:py-10">
            <h2 id="stats-title" className="sr-only">
              {t("Home.statsTitle")}
            </h2>
            <div
              className={cn(
                "grid gap-x-6 gap-y-7 sm:grid-cols-2",
                stats.length >= 4 && "lg:grid-cols-4",
                stats.length === 3 && "lg:grid-cols-3",
              )}
            >
              {stats.map((s, i) => (
                <StatTile
                  key={`${s.label}-${i}`}
                  icon={STAT_ICONS[statKind(s.label, s.value)]}
                  value={s.value}
                  label={s.label}
                  tone={STAT_TONES[i % STAT_TONES.length]}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What we do */}
      <Section>
        <SectionHeading
          eyebrow={t("Home.whatEyebrow")}
          eyebrowColor="purple"
          title={t("Home.whatTitle")}
        />
        <ul className="reveal-group grid gap-4 md:grid-cols-3">
          {pillars.map(({ key, icon: Icon, tone, bar, card }, i) => (
            <li
              key={key}
              className={cn(
                "group relative isolate hover-lift overflow-hidden rounded-3xl p-6 ring-1 ring-border sm:p-7",
                card,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-0 h-1.5 origin-left scale-x-25 transition-transform duration-500 group-hover:scale-x-100",
                  bar,
                )}
              />
              {/* Decorative numeral drawn with CSS content: not text, so not read or contrast-checked. */}
              <span
                aria-hidden="true"
                data-n={`0${i + 1}`}
                className="absolute -right-2 -bottom-6 -z-10 font-heading text-[7rem] leading-none font-extrabold text-card/70 before:content-[attr(data-n)] dark:text-foreground/5"
              />
              <span
                className={cn(
                  "mb-5 flex size-14 items-center justify-center rounded-2xl shadow-soft transition-transform duration-300 motion-safe:group-hover:-rotate-6",
                  tone,
                )}
              >
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <h3 className="mb-2 flex items-center gap-2 text-xl font-bold">
                <Link
                  href={{ pathname: "/news", query: { category: key } }}
                  className="after:absolute after:inset-0"
                >
                  {t(`News.categories.${key}`)}
                </Link>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </h3>
              <p className="text-sm text-muted-foreground">{t(`About.directions.${key}`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Impact report teaser (only when yearly numbers exist) */}
      {impact?.total && (
        <section className="container-page pb-14 sm:pb-20">
          <div className="reveal relative isolate grid gap-8 overflow-hidden rounded-[2rem] bg-brand-green-soft p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-16 -z-10 size-72 rounded-full border-[2.5rem] border-brand-green/10"
            />
            <div className="space-y-3">
              <Eyebrow color="green">{t("Home.impactEyebrow")}</Eyebrow>
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                {t("Home.impactTitle", { year: displayYear(impact.schoolYear) })}
              </h2>
              <dl className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
                {[
                  { label: t("Impact.activities"), value: String(impact.total.activities) },
                  ...(sdgCount > 0
                    ? [{ label: t("Home.impactSdgs"), value: String(sdgCount) }]
                    : []),
                  ...(impact.total.online > 0 &&
                  !shownValues.has(formatNumber(impact.total.online).replace(/\s/g, ""))
                    ? [{ label: t("Home.impactOnline"), value: formatNumber(impact.total.online) }]
                    : []),
                ]
                  .filter((s) => !shownValues.has(s.value))
                  .map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">{s.label}</dt>
                      <dd className="order-first font-heading text-2xl font-extrabold text-brand-green-strong sm:text-4xl">
                        <CountUp value={s.value} />
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
            <Button asChild size="lg">
              <Link href="/impact">
                <BarChart3 /> {t("Home.impactCta")}
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Latest news (hidden when there is none) */}
      {news.length > 0 && (
        <Section surface="tint">
          <div>
            <SectionHeading
              title={t("Home.newsTitle")}
              description={t("Home.newsDescription")}
              action={
                <Button asChild variant="outline">
                  <Link href="/news">
                    {t("Common.viewAll")} <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <div className="reveal-group grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((item, i) => (
                <NewsCard key={item.id} item={item} priority={i === 0} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Upcoming events (hidden when there are none) */}
      {events.length > 0 && (
        <Section>
          <SectionHeading
            title={t("Home.eventsTitle")}
            description={t("Home.eventsDescription")}
            action={
              <Button asChild variant="outline">
                <Link href="/events">
                  {t("Common.viewAll")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <div className="reveal-group grid gap-4 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        </Section>
      )}

      {/* Gallery preview */}
      {gallery.length > 0 && (
        <Section surface="tint">
          <SectionHeading
            title={t("Home.galleryTitle")}
            description={t("Home.galleryDescription")}
            action={
              <Button asChild variant="outline">
                <Link href="/gallery">
                  {t("Common.viewAll")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <ul className="reveal-group grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((img, i) => (
              <li key={img.id} className={cn(i === 0 && bigFirst && "row-span-2")}>
                <Link
                  href={`/gallery/${img.albumSlug}`}
                  className="group block size-full overflow-hidden rounded-2xl ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- R2 thumbnails */}
                  <img
                    src={img.thumbUrl}
                    alt={img.alt}
                    loading="lazy"
                    className={cn(
                      "w-full object-cover transition-transform duration-500 group-hover:scale-105",
                      i === 0 && bigFirst ? "h-full min-h-48" : "aspect-[4/3]",
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Partners + social (each part only when the admin has filled it in) */}
      {(partners.length > 0 || socials.length > 0) && (
        <Section>
          <div
            className={cn(
              "grid gap-10 lg:items-center",
              partners.length > 0 && socials.length > 0 && "lg:grid-cols-2",
            )}
          >
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold sm:text-4xl">{t("Home.connectTitle")}</h2>
              <p className="text-lg text-muted-foreground">
                {t(partners.length > 0 ? "Home.connectBody" : "Home.connectBodyNoPartners")}
                {socials.length > 0 && <> {t("Home.connectFollow")}</>}
              </p>
              {socials.length > 0 && <SocialLinks socials={socials} variant="buttons" />}
            </div>
            {partners.length > 0 && (
              <div
                className={cn(
                  "grid gap-8",
                  partners.some((p) => p.beneficiary) &&
                    partners.some((p) => !p.beneficiary) &&
                    "md:grid-cols-2",
                )}
              >
                {[
                  {
                    key: "partners",
                    title: t("Home.partnersTitle"),
                    items: partners.filter((p) => !p.beneficiary),
                  },
                  {
                    key: "beneficiaries",
                    title: t("Home.beneficiariesTitle"),
                    items: partners.filter((p) => p.beneficiary),
                  },
                ]
                  .filter((g) => g.items.length > 0)
                  .map((g) => (
                    <div key={g.key} className="text-center md:text-left">
                      <h3 className="mb-4 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                        {g.title}
                      </h3>
                      <ul className="flex flex-wrap justify-center gap-3 md:justify-start">
                        {g.items.map((p, i) => (
                          <li key={`${p.name}-${i}`} className="max-w-full">
                            <PartnerChip name={p.name} logoUrl={p.logo} url={p.url} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* CTA — warm tinted band with two soft shapes. */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="reveal relative isolate overflow-hidden rounded-[2rem] bg-brand-gold-soft px-6 py-12 text-center ring-1 ring-border sm:px-12 sm:py-20">
          <ColorRibbon className="absolute top-6 left-1/2 -translate-x-1/2" />
          <div
            aria-hidden="true"
            className="absolute -top-20 -left-16 -z-10 size-64 rounded-full bg-brand-sun/35"
          />
          <div
            aria-hidden="true"
            className="absolute -right-12 -bottom-24 -z-10 size-72 rounded-full bg-brand-coral/20"
          />
          <h2 className="mx-auto max-w-2xl text-[clamp(1.75rem,1.3rem+2vw,2.6rem)] leading-tight font-extrabold">
            {t("Home.ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("Home.ctaBody")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/join">{t("Common.joinCta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/support">{t("Home.ctaSupport")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
