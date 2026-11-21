import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { CoverImage, categoryTone, coverIconFor } from "@/components/common/cover-image";
import { RichText } from "@/components/common/rich-text";
import { Section, SectionHeading } from "@/components/common/section";
import { UntranslatedBadge } from "@/components/common/untranslated-badge";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { ActivityFacts } from "@/components/impact/activity-facts";
import { SdgBadges } from "@/components/impact/sdg-badges";
import { NewsCard } from "@/components/news/news-card";
import { ShareButtons } from "@/components/news/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getClubNames } from "@/lib/branding";
import { getEventById } from "@/lib/data/events";
import { getAlbumById } from "@/lib/data/gallery";
import { getAdjacentNews, getNewsBySlug, getRelatedNews } from "@/lib/data/news";
import { findSlugRedirect } from "@/lib/data/redirects";
import { formatDate } from "@/lib/dates/format";
import { newsCoverTransition } from "@/lib/motion/transitions";
import { withoutRepeatedLead } from "@/lib/rich-text/sanitize";
import { getSiteUrl, jsonLd, localizedPath, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const item = await getNewsBySlug(locale, slug);
  if (!item) return {};
  return pageMetadata({
    locale,
    path: `/news/${item.slug}`,
    title: item.metaTitle || item.title,
    description: item.metaDescription || item.excerpt,
    image: item.coverUrl,
    type: "article",
    publishedTime: item.publishedAt,
  });
}

export default async function NewsDetailPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const item = await getNewsBySlug(locale, slug);
  if (!item) {
    // Renamed post: permanent redirect from the old slug.
    const to = await findSlugRedirect("news", slug);
    if (to) permanentRedirect(localizedPath(locale, `/news/${to}`));
    notFound();
  }
  const album = item.albumId ? await getAlbumById(locale, item.albumId) : null;

  const t = await getTranslations("News");
  const ta = await getTranslations("Activity");
  const [related, event, adjacent] = await Promise.all([
    getRelatedNews(locale, item, 3),
    item.eventId ? getEventById(locale, item.eventId) : Promise.resolve(null),
    getAdjacentNews(locale, item),
  ]);
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}${localizedPath(locale, `/news/${item.slug}`)}`;

  const structured = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: item.excerpt,
    datePublished: item.publishedAt,
    image:
      item.coverUrl && !item.coverUrl.endsWith(".svg")
        ? [`${siteUrl}${item.coverUrl}`]
        : [`${siteUrl}/og-default.png`],
    mainEntityOfPage: url,
    inLanguage: locale,
    publisher: { "@type": "Organization", name: (await getClubNames(locale)).name, url: siteUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      <article>
        <header className="container-page max-w-4xl pt-8 sm:pt-12">
          <Button asChild variant="ghost" className="mb-6 -ml-3">
            <Link href="/news">
              <ArrowLeft /> {t("backToList")}
            </Link>
          </Button>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="rounded-full bg-brand-cyan-soft text-foreground">
              {t(`categories.${item.category}`)}
            </Badge>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time dateTime={item.publishedAt}>
                {formatDate(locale, item.publishedAt, "long")}
              </time>
            </span>
          </div>
          {item.untranslated && <UntranslatedBadge className="mb-3" />}
          <h1
            lang={item.untranslated ? "mn" : undefined}
            className="text-[clamp(2rem,1.4rem+2.6vw,3.2rem)] leading-[1.12] font-extrabold"
          >
            {item.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{item.excerpt}</p>
        </header>

        <div className="container-page mt-8 max-w-5xl">
          {/* Same view-transition name as the news card: the cover morphs card → article. */}
          <ViewTransition name={newsCoverTransition(item.id)} share="morph" default="none">
            <div className="@container aspect-[16/9] overflow-hidden rounded-[2rem]">
              <CoverImage
                src={item.coverUrl}
                date={item.publishedAt}
                locale={locale}
                alt={item.title}
                tone={categoryTone[item.category]}
                icon={coverIconFor(item.category)}
                sdgs={item.sdgs}
                priority
              />
            </div>
          </ViewTransition>
        </div>

        <div className="container-page max-w-3xl space-y-8 py-10 sm:py-14">
          <div
            lang={item.untranslated ? "mn" : undefined}
            className="max-w-[68ch] text-[1.0625rem] leading-[1.7] sm:text-lg"
          >
            <RichText doc={withoutRepeatedLead(item.content, item.excerpt)} />
          </div>
          {album && album.images.length > 0 && (
            <section aria-labelledby="post-album" className="space-y-3">
              <h2 id="post-album" className="text-xl font-extrabold">
                <Link href={`/gallery/${album.slug}`} className="hover:underline">
                  {album.title}
                </Link>
              </h2>
              <GalleryGrid images={album.images} title={album.title} />
            </section>
          )}
          {event && <ActivityFacts facts={event.facts} />}
          {item.sdgs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
                {ta("sdgTitle")}
              </h2>
              <SdgBadges sdgs={item.sdgs} />
            </div>
          )}
          {event && (
            <Button asChild variant="outline">
              <Link href={`/events/${event.slug}`}>
                <CalendarDays /> {ta("seeEvent")}
              </Link>
            </Button>
          )}

          {/* Tags are entered in Mongolian only, so they are shown on the Mongolian site. */}
          {locale === "mn" && item.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{t("tags")}:</span>
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-6 border-t pt-6">
            <ShareButtons url={url} title={item.title} />
          </div>
          {(adjacent.older || adjacent.newer) && (
            <nav aria-label={t("moreArticles")} className="grid gap-3 sm:grid-cols-2">
              {adjacent.newer && (
                <Link
                  href={`/news/${adjacent.newer.slug}`}
                  className="group flex hover-lift flex-col gap-1 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border"
                >
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> {t("newer")}
                  </span>
                  <span className="font-bold group-hover:text-brand-cyan-strong">
                    {adjacent.newer.title}
                  </span>
                </Link>
              )}
              {adjacent.older && (
                <Link
                  href={`/news/${adjacent.older.slug}`}
                  className="group flex hover-lift flex-col items-end gap-1 rounded-2xl bg-card p-4 text-right shadow-soft ring-1 ring-border sm:col-start-2"
                >
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    {t("older")} <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="font-bold group-hover:text-brand-cyan-strong">
                    {adjacent.older.title}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <Section surface="tint">
          <SectionHeading title={t("related")} />
          <div className="reveal-group grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <NewsCard key={r.id} item={r} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
