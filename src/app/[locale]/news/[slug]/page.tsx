import { ArrowLeft, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoverImage, categoryTone } from "@/components/common/cover-image";
import { RichText } from "@/components/common/rich-text";
import { Section, SectionHeading } from "@/components/common/section";
import { NewsCard } from "@/components/news/news-card";
import { ShareButtons } from "@/components/news/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPathname, Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getNewsBySlug, getRelatedNews } from "@/lib/data/news";
import { formatDate } from "@/lib/dates/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const item = await getNewsBySlug(locale, slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.excerpt,
    openGraph: {
      type: "article",
      title: item.title,
      description: item.excerpt,
      publishedTime: item.publishedAt,
      images: item.coverUrl ? [item.coverUrl] : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const item = await getNewsBySlug(locale, slug);
  if (!item) notFound();

  const t = await getTranslations("News");
  const related = await getRelatedNews(locale, item, 3);
  const url = new URL(
    getPathname({ href: `/news/${item.slug}`, locale }),
    siteConfig.url,
  ).toString();

  return (
    <>
      <article>
        <header className="container-page max-w-4xl pt-8 sm:pt-12">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
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
          <h1 className="text-3xl leading-tight font-extrabold sm:text-5xl">{item.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{item.excerpt}</p>
        </header>

        <div className="container-page mt-8 max-w-5xl">
          <div className="aspect-[16/9] overflow-hidden rounded-[2rem]">
            <CoverImage
              src={item.coverUrl}
              alt={item.title}
              tone={categoryTone[item.category]}
              icon={item.category}
              priority
            />
          </div>
        </div>

        <div className="container-page max-w-3xl py-10 sm:py-14">
          <RichText doc={item.content} />

          {item.tags.length > 0 && (
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
        </div>
      </article>

      {related.length > 0 && (
        <Section className="bg-muted/30">
          <SectionHeading title={t("related")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <NewsCard key={r.id} item={r} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
