import { getLocale, getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { CoverImage, categoryTone, coverIconFor } from "@/components/common/cover-image";
import { UntranslatedBadge } from "@/components/common/untranslated-badge";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { NewsItem } from "@/lib/data/news";
import { formatDate } from "@/lib/dates/format";
import { newsCoverTransition } from "@/lib/motion/transitions";
import { displayYear } from "@/lib/school-year";

export async function NewsCard({
  item,
  priority,
  showYear = false,
}: {
  item: NewsItem;
  priority?: boolean;
  /** Small school-year label (lists that are not grouped by year, e.g. search results). */
  showYear?: boolean;
}) {
  const t = await getTranslations("News");
  const ty = await getTranslations("SchoolYear");
  const locale = await getLocale();

  return (
    <article className="group relative flex hover-lift flex-col overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-border">
      <ViewTransition name={newsCoverTransition(item.id)} share="morph" default="none">
        <div className="@container aspect-[16/10] overflow-hidden">
          <CoverImage
            src={item.coverUrl}
            alt={item.title}
            tone={categoryTone[item.category]}
            icon={coverIconFor(item.category)}
            sdgs={item.sdgs}
            date={item.publishedAt}
            locale={locale as Locale}
            priority={priority}
            className="transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
        </div>
      </ViewTransition>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-full">
            {t(`categories.${item.category}`)}
          </Badge>
          {item.featured && (
            <Badge className="rounded-full bg-brand-sun text-brand-ink">{t("featured")}</Badge>
          )}
          <time dateTime={item.publishedAt}>{formatDate(locale, item.publishedAt, "long")}</time>
          {showYear && <span>· {ty("label", { year: displayYear(item.schoolYear) })}</span>}
          {item.untranslated && <UntranslatedBadge />}
        </div>
        <h3 className="text-lg leading-snug font-bold" lang={item.untranslated ? "mn" : undefined}>
          <Link
            href={`/news/${item.slug}`}
            className="after:absolute after:inset-0 hover:text-brand-cyan-strong"
          >
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
      </div>
    </article>
  );
}
