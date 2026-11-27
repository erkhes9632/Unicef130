import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { getYearLabels } from "@/components/common/year-labels";
import { AlbumCard } from "@/components/gallery/album-card";
import { GalleryBrowser } from "@/components/gallery/gallery-browser";
import { resolveLocale } from "@/i18n/locale";
import { listAlbums } from "@/lib/data/gallery";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return pageMetadata({
    locale,
    path: "/gallery",
    title: t("metaTitle"),
    description: t("description"),
  });
}

/** Cached page: albums newest first, grouped by school year in the browser (?year= chips). */
export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  const locale = await resolveLocale(params);
  const [t, albums, years] = await Promise.all([
    getTranslations("Gallery"),
    listAlbums(locale),
    getYearLabels(),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        eyebrowColor="gold"
        title={t("title")}
        description={t("description")}
      />
      <Section className="pt-8 sm:pt-10">
        <h2 className="sr-only">{t("metaTitle")}</h2>
        {albums.length > 0 ? (
          <GalleryBrowser
            albums={albums.map((a) => ({ id: a.id, year: a.schoolYear }))}
            cards={Object.fromEntries(
              albums.map((a, i) => [a.id, <AlbumCard key={a.id} album={a} priority={i === 0} />]),
            )}
            labels={years}
          />
        ) : (
          <JoinEmptyState title={t("empty")} />
        )}
      </Section>
    </>
  );
}
