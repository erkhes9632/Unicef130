import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { getYearLabels } from "@/components/common/year-labels";
import { SdgBadges } from "@/components/impact/sdg-badges";
import { NewsBrowser } from "@/components/news/news-browser";
import { NewsCard } from "@/components/news/news-card";
import { resolveLocale } from "@/i18n/locale";
import { listAllNews } from "@/lib/data/news";
import { pageMetadata } from "@/lib/seo";
import { newsCategories } from "@/lib/types";

const PAGE_SIZE = 6;

export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "News" });
  return pageMetadata({
    locale,
    path: "/news",
    title: t("metaTitle"),
    description: t("description"),
  });
}

/**
 * Cached page: all posts are rendered once, newest first; the browser groups them by school
 * year and applies the year / category / SDG filters and pages.
 */
export default async function NewsPage({ params }: PageProps<"/[locale]/news">) {
  const locale = await resolveLocale(params);
  const [t, tp, items, years] = await Promise.all([
    getTranslations("News"),
    getTranslations("Pagination"),
    listAllNews(locale),
    getYearLabels(),
  ]);
  const usedSdgs = [...new Set(items.flatMap((i) => i.sdgs))];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="pt-8 sm:pt-10">
        <h2 className="sr-only">{t("metaTitle")}</h2>
        {items.length === 0 ? (
          <JoinEmptyState title={t("emptyAll")} />
        ) : (
          <NewsBrowser
            items={items.map((i) => ({
              id: i.id,
              category: i.category,
              sdgs: i.sdgs,
              year: i.schoolYear,
            }))}
            cards={Object.fromEntries(
              items.map((item, i) => [
                item.id,
                <NewsCard key={item.id} item={item} priority={i === 0} />,
              ]),
            )}
            sdgBadges={Object.fromEntries(
              usedSdgs.map((n) => [n, <SdgBadges key={n} sdgs={[n]} linked={false} />]),
            )}
            categories={newsCategories}
            pageSize={PAGE_SIZE}
            labels={{
              filter: t("filterLabel"),
              all: t("allCategories"),
              categories: Object.fromEntries(newsCategories.map((c) => [c, t(`categories.${c}`)])),
              clearFilter: t("clearFilter"),
              empty: t("empty"),
              backToList: t("backToList"),
              pagination: {
                label: tp("label"),
                previous: tp("previous"),
                next: tp("next"),
                page: tp.raw("page") as string,
              },
              years,
            }}
          />
        )}
      </Section>
    </>
  );
}
