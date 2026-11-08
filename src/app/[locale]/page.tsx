import { ArrowRight, BookOpenText, HandHeart, Heart, Scale, School } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LogoImage } from "@/components/brand/logo-image";
import { SocialIcon, socialTitle } from "@/components/brand/social-icon";
import { DecorativeShapes } from "@/components/common/decorative-shapes";
import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow, Section, SectionHeading } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getUpcomingEvents } from "@/lib/data/events";
import { pageMetadata } from "@/lib/seo";
import { getGalleryPreview } from "@/lib/data/gallery";
import { getLatestNews } from "@/lib/data/news";
import { getSiteSettings } from "@/lib/data/settings";
import { formatNumber } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

const pillars = [
  { key: "inside", icon: School, tone: "bg-brand-cyan-soft text-brand-cyan-strong" },
  { key: "outside", icon: HandHeart, tone: "bg-brand-green-soft text-brand-green-strong" },
  { key: "rights", icon: Scale, tone: "bg-brand-purple-soft text-brand-purple-strong" },
  { key: "charity", icon: Heart, tone: "bg-brand-gold-soft text-brand-gold-strong" },
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
  const [news, events, gallery, settings] = await Promise.all([
    getLatestNews(locale, 3),
    getUpcomingEvents(locale, 3),
    getGalleryPreview(locale, 5),
    getSiteSettings(),
  ]);
  const socials = settings.socials.filter((s) => s.url);
  const stats = [
    { key: "members", value: settings.stats.members },
    { key: "events", value: settings.stats.events },
    { key: "volunteerHours", value: settings.stats.volunteerHours },
    { key: "childrenHelped", value: settings.stats.childrenHelped },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <DecorativeShapes variant="hero" />
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="space-y-6">
            <Eyebrow>{t("Home.heroEyebrow")}</Eyebrow>
            <h1 className="text-4xl leading-[1.1] font-extrabold sm:text-5xl lg:text-6xl">
              {t("Home.heroTitle")}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">{t("Home.heroBody")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/join">
                  {t("Common.joinCta")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">{t("Home.heroSecondary")}</Link>
              </Button>
            </div>
          </div>

          {/* Logo card: "130-р сургууль × UNICEF" */}
          <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]">
            <div className="absolute inset-0 -z-10 rotate-3 rounded-[2.5rem] bg-linear-to-br from-brand-cyan via-brand-purple to-brand-gold opacity-80" />
            <div className="rounded-[2.5rem] bg-card p-8 shadow-xl ring-1 ring-border sm:p-10">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <LogoImage
                  src={siteConfig.logos.school.src}
                  alt={siteConfig.logos.school.alt}
                  size={96}
                  placeholderLabel={t("Common.logoPlaceholder")}
                />
                <span aria-hidden="true" className="text-3xl font-extrabold text-muted-foreground">
                  ×
                </span>
                <LogoImage
                  src={siteConfig.logos.unicef.src}
                  alt={siteConfig.logos.unicef.alt}
                  size={96}
                  placeholderLabel={t("Common.logoPlaceholder")}
                />
              </div>
              <p className="mt-6 text-center font-heading text-xl font-extrabold">
                {t("Common.clubName")}
              </p>
              <p className="text-center text-sm text-muted-foreground">{t("Common.brandPair")}</p>
              <div aria-hidden="true" className="mt-6 flex justify-center gap-1.5">
                {[
                  "bg-brand-cyan",
                  "bg-brand-purple",
                  "bg-brand-green",
                  "bg-brand-blue",
                  "bg-brand-gold",
                ].map((c) => (
                  <span key={c} className={cn("h-2 w-8 rounded-full", c)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-labelledby="stats-title" className="border-y bg-muted/40">
        <div className="container-page py-10">
          <h2 id="stats-title" className="sr-only">
            {t("Home.statsTitle")}
          </h2>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.key} className="flex flex-col text-center">
                <dt className="text-sm text-muted-foreground">{t(`Home.stats.${s.key}`)}</dt>
                <dd
                  className={cn(
                    "order-first font-heading text-4xl font-extrabold sm:text-5xl",
                    statTones[i],
                  )}
                >
                  {formatNumber(s.value)}+
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* What we do */}
      <Section>
        <SectionHeading
          eyebrow={t("Home.whatEyebrow")}
          eyebrowColor="purple"
          title={t("Home.whatTitle")}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ key, icon: Icon, tone }) => (
            <li key={key} className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <span
                className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl", tone)}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mb-2 text-lg font-bold">{t(`Home.pillars.${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`Home.pillars.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Latest news */}
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item, i) => (
              <NewsCard key={item.id} item={item} priority={i === 0} />
            ))}
          </div>
        </div>
      </Section>

      {/* Upcoming events */}
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
        {events.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpenText} title={t("Home.noUpcoming")} />
        )}
      </Section>

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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((img, i) => (
              <li key={img.id} className={cn(i === 0 && "row-span-2")}>
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
                      i === 0 ? "h-full min-h-48" : "aspect-[4/3]",
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Partners + social */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t("Home.connectTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("Home.connectBody")}</p>
            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-2">
                {socials.map((s) => (
                  <li key={s.platform}>
                    <Button asChild variant="outline">
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        <SocialIcon platform={s.platform} className="size-4" />
                        {socialTitle(s.platform)}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-muted-foreground uppercase">
              {t("Home.partnersTitle")}
            </h3>
            {/* TODO(content): partner logos/names (only files the developer provides). */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <li
                  key={n}
                  className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed text-sm font-semibold text-muted-foreground"
                >
                  {t("Home.partnerPlaceholder")} {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-brand-night px-6 py-12 text-center text-white sm:px-12 sm:py-16">
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
