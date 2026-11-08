import { getLocale, getTranslations } from "next-intl/server";
import { CoverImage, categoryTone } from "@/components/common/cover-image";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { NewsItem } from "@/lib/data/news";
import { formatDate } from "@/lib/dates/format";

export async function NewsCard({ item, priority }: { item: NewsItem; priority?: boolean }) {
  const t = await getTranslations("News");
  const locale = await getLocale();

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border transition-shadow hover:shadow-lg hover:shadow-brand-cyan/10">
      <div className="aspect-[16/10] overflow-hidden">
        <CoverImage
          src={item.coverUrl}
          alt={item.title}
          tone={categoryTone[item.category]}
          icon={item.category}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-full">
            {t(`categories.${item.category}`)}
          </Badge>
          <time dateTime={item.publishedAt}>{formatDate(locale, item.publishedAt, "long")}</time>
        </div>
        <h3 className="text-lg leading-snug font-bold">
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
