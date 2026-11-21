import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { PaginationNav } from "@/components/common/pagination-nav";
import { Section } from "@/components/common/section";
import { SdgBadges } from "@/components/impact/sdg-badges";
import { NewsCard } from "@/components/news/news-card";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { listNews } from "@/lib/data/news";
import { isSdg } from "@/lib/sdg";
import { pageMetadata } from "@/lib/seo";
import { newsCategories, type NewsCategory } from "@/lib/types";
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
      "inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-semibold whitespace-nowrap ring-1 ring-border transition-colors hover:bg-muted",
      active && "bg-brand-cyan text-brand-ink ring-brand-cyan hover:bg-brand-cyan",
    );

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="pt-8 sm:pt-10">
        <h2 className="sr-only">{t("metaTitle")}</h2>
        {!noNewsAtAll && (
          <nav
            aria-label={t("filterLabel")}
            // Scrolls sideways on phones; the edges fade so it reads as "more this way".
            className="-mx-4 mb-8 [scrollbar-width:none] overflow-x-auto [mask-image:linear-gradient(90deg,transparent,black_1rem,black_calc(100%-1.5rem),transparent)] px-4 py-1 sm:mx-0 sm:[mask-image:none] sm:px-0"
          >
            <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
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
          <div className="reveal-group grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
