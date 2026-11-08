import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/common/section";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getAlbumBySlug } from "@/lib/data/gallery";
import { pageMetadata } from "@/lib/seo";
import { formatDate, fromIsoDate } from "@/lib/dates/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gallery/[album]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { album: slug } = await params;
  const album = await getAlbumBySlug(locale, slug);
  if (!album) return {};
  return pageMetadata({
    locale,
    path: `/gallery/${album.slug}`,
    title: album.title,
    description: album.description,
    image: album.coverUrl,
  });
}

export default async function AlbumPage({ params }: PageProps<"/[locale]/gallery/[album]">) {
  const locale = await resolveLocale(params);
  const { album: slug } = await params;
  const album = await getAlbumBySlug(locale, slug);
  if (!album) notFound();
  const t = await getTranslations("Gallery");

  return (
    <Section className="pt-8 sm:pt-12">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
        <Link href="/gallery">
          <ArrowLeft /> {t("backToAlbums")}
        </Link>
      </Button>
      <header className="mb-8 max-w-3xl space-y-3">
        <h1 className="text-3xl font-extrabold sm:text-5xl">{album.title}</h1>
        <p className="text-lg text-muted-foreground">{album.description}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={album.date}>{formatDate(locale, fromIsoDate(album.date), "long")}</time> ·{" "}
          {t("photos", { count: album.imageCount })}
        </p>
      </header>
      <GalleryGrid images={album.images} title={album.title} />
    </Section>
  );
}
