import { Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getPathname } from "@/i18n/navigation";
import { searchEvents } from "@/lib/data/events";
import { searchNews } from "@/lib/data/news";
import { searchOtherContent } from "@/lib/data/search";
import { pageMetadata } from "@/lib/seo";

// Per visitor (session / query string): never cached, unlike the public pages.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/search">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Search" });
  return pageMetadata({
    locale,
    path: "/search",
    title: t("metaTitle"),
    description: t("description"),
    noIndex: true,
  });
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const query = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const t = await getTranslations("Search");
  const [news, events, other] =
    query.length >= 2
      ? await Promise.all([
          searchNews(locale, query),
          searchEvents(locale, query),
          searchOtherContent(locale, query),
        ])
      : [[], [], { albums: [], faqs: [], about: null }];
  const total =
    news.length + events.length + other.albums.length + other.faqs.length + (other.about ? 1 : 0);
  const card = "block rounded-2xl bg-card p-5 ring-1 ring-border hover:shadow-md";

  return (
    <>
      <PageHero title={t("title")} description={t("description")}>
        {/* Plain GET form: works without JavaScript */}
        <form
          role="search"
          action={getPathname({ href: "/search", locale })}
          className="flex max-w-xl gap-2 pt-2"
        >
          <label htmlFor="search-q" className="sr-only">
            {t("title")}
          </label>
          <Input
            id="search-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t("placeholder")}
            className="h-12 rounded-full bg-background px-5 text-base"
            minLength={2}
            maxLength={100}
            required
          />
          <Button type="submit" size="lg">
            <SearchIcon /> <span className="sr-only sm:not-sr-only">{t("submit")}</span>
          </Button>
        </form>
      </PageHero>
      <Section className="pt-8 sm:pt-10">
        {query.length < 2 ? (
          <p className="text-muted-foreground">{t("hint")}</p>
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title={t("noResults", { query })} description={t("hint")} />
        ) : (
          <div className="space-y-12">
            <p className="font-semibold" role="status">
              {t("results", { query, count: total })}
            </p>
            {news.length > 0 && (
              <section aria-labelledby="search-news">
                <h2 id="search-news" className="mb-4 text-2xl font-extrabold">
                  {t("news")}
                </h2>
                <div className="reveal-group grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {news.map((n) => (
                    <NewsCard key={n.id} item={n} />
                  ))}
                </div>
              </section>
            )}
            {events.length > 0 && (
              <section aria-labelledby="search-events">
                <h2 id="search-events" className="mb-4 text-2xl font-extrabold">
                  {t("events")}
                </h2>
                <div className="reveal-group grid gap-4 lg:grid-cols-2">
                  {events.map((e) => (
                    <EventCard key={e.id} item={e} />
                  ))}
                </div>
              </section>
            )}
            {other.albums.length > 0 && (
              <section aria-labelledby="search-albums">
                <h2 id="search-albums" className="mb-4 text-2xl font-extrabold">
                  {t("albums")}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {other.albums.map((a) => (
                    <li key={a.id}>
                      <Link href={`/gallery/${a.slug}`} className={card}>
                        <span className="font-bold">{a.title}</span>
                        {a.description && (
                          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                            {a.description}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {other.faqs.length > 0 && (
              <section aria-labelledby="search-faq">
                <h2 id="search-faq" className="mb-4 text-2xl font-extrabold">
                  {t("faq")}
                </h2>
                <ul className="space-y-3">
                  {other.faqs.map((f) => (
                    <li key={f.id}>
                      <Link href="/faq" className={card}>
                        <span className="font-bold">{f.question}</span>
                        <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                          {f.answer}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {other.about && (
              <section aria-labelledby="search-about">
                <h2 id="search-about" className="mb-4 text-2xl font-extrabold">
                  {t("about")}
                </h2>
                <Link href="/about" className={card}>
                  <span className="text-sm text-muted-foreground">{other.about}</span>
                </Link>
              </section>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
