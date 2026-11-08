import { ArrowLeft, CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/common/cover-image";
import { RichText } from "@/components/common/rich-text";
import { ShareButtons } from "@/components/news/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getPathname, Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getEventBySlug, isUpcoming } from "@/lib/data/events";
import { formatDate, formatTimeRange } from "@/lib/dates/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const e = await getEventBySlug(locale, slug);
  if (!e) return {};
  return {
    title: e.title,
    description: e.summary,
    openGraph: {
      title: e.title,
      description: e.summary,
      images: e.coverUrl ? [e.coverUrl] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const e = await getEventBySlug(locale, slug);
  if (!e) notFound();

  const t = await getTranslations("Events");
  const start = new Date(e.startsAt);
  const time = formatTimeRange(locale, start, e.endsAt);
  const url = new URL(
    getPathname({ href: `/events/${e.slug}`, locale }),
    siteConfig.url,
  ).toString();
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`;
  const past = !isUpcoming(e);

  const facts = [
    { icon: CalendarDays, label: t("date"), value: formatDate(locale, start, "full") },
    { icon: Clock, label: t("time"), value: time },
    { icon: MapPin, label: t("location"), value: e.location },
  ];

  return (
    <article className="container-page max-w-5xl py-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
        <Link href="/events">
          <ArrowLeft /> {t("backToList")}
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {past && (
            <Badge variant="outline" className="rounded-full">
              {t("pastBadge")}
            </Badge>
          )}
          <h1 className="text-3xl leading-tight font-extrabold sm:text-5xl">{e.title}</h1>
          <p className="text-lg text-muted-foreground">{e.summary}</p>
          <div className="aspect-[16/9] overflow-hidden rounded-[2rem]">
            <CoverImage src={e.coverUrl} alt={e.title} tone="purple" icon="event" priority />
          </div>
          <RichText doc={e.content} />
          <div className="border-t pt-6">
            <ShareButtons url={url} title={e.title} />
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-brand-purple-soft p-6 lg:sticky lg:top-24">
          <dl className="space-y-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-brand-purple-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-bold text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="outline" className="bg-background">
              <a href={mapHref} target="_blank" rel="noopener noreferrer">
                <MapPin /> {t("openMap")}
              </a>
            </Button>
            {!past && (
              <Button asChild>
                <a href={`/api/events/${e.slug}/ics?lang=${locale}`} download>
                  <CalendarPlus /> {t("addToCalendar")}
                </a>
              </Button>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
