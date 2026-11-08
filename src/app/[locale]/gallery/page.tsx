import { Images } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { AlbumCard } from "@/components/gallery/album-card";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { listAlbums } from "@/lib/data/gallery";

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

export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Gallery");
  const albums = await listAlbums(locale);

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Images} title={t("empty")} />
        )}
      </Section>
    </>
  );
}
