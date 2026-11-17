import { ArrowRight, BarChart3, GraduationCap, HandHeart, Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LogoImage, Monogram } from "@/components/brand/logo-image";
import { SocialLinks } from "@/components/brand/social-links";
import { CountUp } from "@/components/common/count-up";
import {
  ColorRibbon,
  DecorativeShapes,
  HeroHighlight,
} from "@/components/common/decorative-shapes";
import { Eyebrow, Section, SectionHeading } from "@/components/common/section";
import { DateBadge } from "@/components/events/date-badge";
import { EventCard } from "@/components/events/event-card";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getBranding } from "@/lib/branding";
import { getUpcomingEvents } from "@/lib/data/events";
import { getGalleryPreview } from "@/lib/data/gallery";
import { displayYear, getLatestImpact } from "@/lib/data/impact";
import { pick } from "@/lib/data/localize";
import { getLatestNews } from "@/lib/data/news";
import { getHomeStats, getSiteSettings, safeExternalUrl, safeImageUrl } from "@/lib/data/settings";
import { formatMnt, formatNumber } from "@/lib/dates/format";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const pillars = [
  {
    key: "activity",
    icon: Megaphone,
    tone: "bg-brand-cyan-soft text-brand-cyan-strong",
    bar: "bg-brand-cyan",
  },
  {
    key: "education",
    icon: GraduationCap,
    tone: "bg-brand-purple-soft text-brand-purple-strong",
    bar: "bg-brand-purple",
  },
  {
    key: "charity",
    icon: HandHeart,
    tone: "bg-brand-gold-soft text-brand-gold-strong",
    bar: "bg-brand-gold",
  },
] as const;

const statTones = [
  "text-brand-cyan-strong",
  "text-brand-purple-strong",
  "text-brand-green-strong",
  "text-brand-blue-strong",
];

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
  // One tall tile + a 2×2 block only works with exactly five photos; otherwise an even grid.
  const bigFirst = gallery.length === 5;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <DecorativeShapes variant="hero" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dot-grid" />
        <div className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24 xl:gap-16">
          <div className="space-y-6">
            <Eyebrow className="animate-rise-in">
              {founded ? t("Home.heroEyebrow", { year: founded }) : t("Home.heroEyebrowNoYear")}
            </Eyebrow>
            <h1 className="text-[clamp(2.4rem,9vw,3rem)] leading-[1.08] font-extrabold sm:text-6xl lg:text-[4.1rem]">
              {t.rich("Home.heroTitle", {
                hl: (chunks) => <HeroHighlight>{chunks}</HeroHighlight>,
              })}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground sm:text-xl/relaxed">
              {t("Home.heroBody")}
            </p>
            <div className="flex animate-rise-in flex-col gap-3 [animation-delay:120ms] sm:flex-row">
              <Button asChild size="lg" className="shadow-lg shadow-brand-cyan/25">
                <Link href="/join">
                  {t("Common.joinCta")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">{t("Home.heroSecondary")}</Link>
              </Button>
            </div>
          </div>

          {/* Hero photo (admin upload) or the logo card "130-р сургууль × UNICEF" */}
          <div className="relative mx-auto w-full max-w-sm animate-rise-in [animation-delay:200ms] sm:max-w-md xl:max-w-lg">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rotate-[5deg] rounded-[2.5rem] bg-linear-to-br from-brand-cyan via-brand-purple to-brand-gold opacity-85"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-20 -rotate-[4deg] rounded-[2.5rem] bg-brand-green/25"
            />
            {branding.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- R2 image, pre-sized on upload
              <img
                src={branding.heroImage.src}
                alt={branding.heroImage.alt || clubName}
                fetchPriority="high"
                className="aspect-[4/3] w-full rounded-[2.5rem] object-cover shadow-xl ring-1 ring-border"
              />
            ) : (
              <div className="rounded-[2.5rem] bg-card p-7 shadow-xl ring-1 ring-border sm:p-10 lg:py-14">
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {branding.schoolLogo || branding.unicefLogo ? (
                    <>
                      <LogoImage
                        src={branding.schoolLogo}
                        alt={t("Common.schoolLogoAlt")}
                        size={96}
                        monogram="130"
                      />
                      {branding.unicefLogo && (
                        <>
                          <span
                            aria-hidden="true"
                            className="text-3xl font-extrabold text-muted-foreground"
                          >
                            ×
                          </span>
                          <LogoImage
                            src={branding.unicefLogo}
                            alt={t("Common.unicefLogoAlt")}
                            size={96}
                            monogram="U"
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <Monogram text="130" size={112} />
                  )}
                </div>
                <p className="mt-6 text-center font-heading text-xl font-extrabold">{clubName}</p>
                <p className="text-center text-sm text-muted-foreground">{t("Common.brandPair")}</p>
                <ColorRibbon className="mt-6 justify-center" />
              </div>
            )}
            {/* The next real event floats over the card corner (from sm up). */}
            {nextEvent && (
              <Link
                href={`/events/${nextEvent.slug}`}
                className="group absolute -bottom-10 left-4 hidden max-w-72 animate-rise-in items-center gap-3 rounded-2xl bg-background/95 p-3 pr-4 shadow-xl ring-1 ring-border backdrop-blur [animation-delay:450ms] hover:ring-brand-cyan sm:flex lg:-left-6"
              >
                <DateBadge date={nextEvent.startsAt} className="w-14" />
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
        </div>
      </section>

      {/* Stats (admin → Сайтын тохиргоо; hidden when none are set) */}
      {stats.length > 0 && (
        <section aria-labelledby="stats-title" className="border-y bg-muted/40">
          <div className="container-page py-10">
            <h2 id="stats-title" className="sr-only">
              {t("Home.statsTitle")}
            </h2>
            {/* 2 columns on phones (an odd last item spans both), one row on desktop. */}
            <dl
              className={cn(
                "grid grid-cols-2 gap-x-4 gap-y-8",
                stats.length === 3 && "sm:grid-cols-3",
                stats.length === 4 && "md:grid-cols-4",
                stats.length === 5 && "sm:grid-cols-3 lg:grid-cols-5",
              )}
            >
              {stats.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  className={cn(
                    "flex min-w-0 flex-col text-center",
                    stats.length % 2 === 1 && i === stats.length - 1 && "col-span-2 sm:col-span-1",
                  )}
                >
                  <dt className="text-sm text-muted-foreground">{s.label}</dt>
                  <dd
                    className={cn(
                      "order-first font-heading text-[clamp(1.6rem,7vw,2.25rem)] font-extrabold whitespace-nowrap tabular-nums sm:text-4xl xl:text-5xl",
                      statTones[i % statTones.length],
                    )}
                  >
                    <CountUp value={s.value} />
                  </dd>
                </div>
              ))}
            </dl>
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
          {pillars.map(({ key, icon: Icon, tone, bar }, i) => (
            <li
              key={key}
              className="group relative isolate overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-border transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-7"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-0 h-1.5 origin-left scale-x-25 transition-transform duration-500 group-hover:scale-x-100",
                  bar,
                )}
              />
              <span
                aria-hidden="true"
                className="absolute -right-2 -bottom-6 -z-10 font-heading text-[7rem] leading-none font-extrabold text-muted/80 dark:text-muted"
              >
                0{i + 1}
              </span>
              <span
                className={cn(
                  "mb-5 flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6",
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
            <div
              aria-hidden="true"
              className="absolute -bottom-24 left-1/3 -z-10 size-56 rounded-full bg-brand-cyan/10 blur-2xl"
            />
            <div className="space-y-3">
              <Eyebrow color="green">{t("Home.impactEyebrow")}</Eyebrow>
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                {t("Home.impactTitle", { year: displayYear(impact.schoolYear) })}
              </h2>
              <dl className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
                {[
                  { label: t("Impact.activities"), value: String(impact.total.activities) },
                  { label: t("Impact.reachTotal"), value: formatNumber(impact.total.total) },
                  ...(impact.total.donationAmount > 0
                    ? [
                        {
                          label: t("Impact.donation"),
                          value: formatMnt(impact.total.donationAmount),
                        },
                      ]
                    : []),
                ].map((s) => (
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
        <Section className="bg-muted/30 pt-0 sm:pt-0">
          <div className="pt-14 sm:pt-20">
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
        <Section className="bg-muted/30">
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
              <div className="space-y-6">
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
                    <div key={g.key}>
                      <h3 className="mb-4 text-sm font-bold tracking-wide text-muted-foreground uppercase">
                        {g.title}
                      </h3>
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {g.items.map((p, i) => {
                          const inner = p.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- R2 logo
                            <img
                              src={p.logo}
                              alt={p.name}
                              loading="lazy"
                              className="max-h-12 w-auto max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-center text-sm font-semibold">{p.name}</span>
                          );
                          const box =
                            "flex h-20 items-center justify-center rounded-2xl bg-card p-3 ring-1 ring-border";
                          return (
                            <li key={`${p.name}-${i}`}>
                              {p.url ? (
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(box, "transition-shadow hover:shadow-md")}
                                >
                                  {inner}
                                </a>
                              ) : (
                                <div className={box}>{inner}</div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* CTA */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="reveal relative isolate overflow-hidden rounded-[2rem] bg-brand-night px-6 py-12 text-center text-white ring-white/10 sm:px-12 sm:py-20 dark:ring-1">
          <ColorRibbon className="absolute top-6 left-1/2 -translate-x-1/2" />
          <div
            aria-hidden="true"
            className="absolute -top-16 -left-10 -z-10 size-64 rounded-full bg-brand-cyan/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-16 -z-10 size-64 rounded-full bg-brand-purple/40 blur-3xl"
          />
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
            {t("Home.ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{t("Home.ctaBody")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/join">{t("Common.joinCta")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
            >
              <Link href="/support">{t("Home.ctaSupport")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
