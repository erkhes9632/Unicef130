import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { PaginationNav } from "@/components/common/pagination-nav";
import { Section } from "@/components/common/section";
import { NewsCard } from "@/components/news/news-card";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { listNews } from "@/lib/data/news";
import { newsCategories, type NewsCategory } from "@/lib/types";
import { SdgBadges } from "@/components/impact/sdg-badges";
import { isSdg } from "@/lib/sdg";
import { cn } from "@/lib/utils";

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

function parseCategory(value: unknown): NewsCategory | undefined {
  return newsCategories.includes(value as NewsCategory) ? (value as NewsCategory) : undefined;
}

export default async function NewsPage({ params, searchParams }: PageProps<"/[locale]/news">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const category = parseCategory(sp.category);
  const sdgParam = Number(sp.sdg);
  const sdg = isSdg(sdgParam) ? sdgParam : undefined;
  const page = Number.parseInt(String(sp.page ?? "1"), 10) || 1;
  const t = await getTranslations("News");
  const { items, page: current, pageCount } = await listNews({ locale, page, category, sdg });
  // No published news at all → one empty state, no category chips.
  const noNewsAtAll = !category && !sdg && items.length === 0;

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted",
      active && "bg-brand-cyan text-brand-night ring-brand-cyan hover:bg-brand-cyan",
    );

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="pt-8 sm:pt-10">
        <h2 className="sr-only">{t("metaTitle")}</h2>
        {!noNewsAtAll && (
          <nav aria-label={t("filterLabel")} className="-mx-4 mb-8 overflow-x-auto px-4">
            <ul className="flex w-max gap-2">
              <li>
                <Link
                  href="/news"
                  className={chip(!category)}
                  aria-current={!category ? "page" : undefined}
                >
                  {t("allCategories")}
                </Link>
              </li>
              {newsCategories.map((c) => (
                <li key={c}>
                  <Link
                    href={{ pathname: "/news", query: { category: c } }}
                    className={chip(category === c)}
                    aria-current={category === c ? "page" : undefined}
                  >
                    {t(`categories.${c}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {sdg && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <SdgBadges sdgs={[sdg]} linked={false} />
            <Link
              href="/news"
              className="text-sm font-semibold text-brand-cyan-strong hover:underline"
            >
              {t("clearFilter")}
            </Link>
          </div>
        )}
        {items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <NewsCard key={item.id} item={item} priority={i === 0} />
            ))}
          </div>
        ) : noNewsAtAll ? (
          <JoinEmptyState icon={Newspaper} title={t("emptyAll")} />
        ) : (
          <EmptyState icon={Newspaper} title={t("empty")}>
            <Link href="/news" className="font-semibold text-brand-cyan-strong hover:underline">
              {t("backToList")}
            </Link>
          </EmptyState>
        )}

        <PaginationNav
          page={current}
          pageCount={pageCount}
          pathname="/news"
          query={{ category, sdg: sdg ? String(sdg) : undefined }}
        />
      </Section>
    </>
  );
}
