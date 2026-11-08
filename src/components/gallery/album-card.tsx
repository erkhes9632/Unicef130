import { Images } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/common/cover-image";
import { Link } from "@/i18n/navigation";
import type { AlbumItem } from "@/lib/data/gallery";
import { formatDate, fromIsoDate } from "@/lib/dates/format";

export async function AlbumCard({ album }: { album: AlbumItem }) {
  const t = await getTranslations("Gallery");
  const locale = await getLocale();

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-card ring-1 ring-border">
      <div className="aspect-[4/3] overflow-hidden">
        <CoverImage
          src={album.coverUrl}
          alt={album.title}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1.5 p-5">
        <h3 className="text-lg font-bold">
          <Link
            href={`/gallery/${album.slug}`}
            className="after:absolute after:inset-0 hover:text-brand-cyan-strong"
          >
            {album.title}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <time dateTime={album.date}>{formatDate(locale, fromIsoDate(album.date), "long")}</time>
          <span className="inline-flex items-center gap-1">
            <Images className="size-3.5" aria-hidden="true" />
            {t("photos", { count: album.imageCount })}
          </span>
        </p>
      </div>
    </article>
  );
}
