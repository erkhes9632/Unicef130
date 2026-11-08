import { ArrowLeft, CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/common/cover-image";
import { RichText } from "@/components/common/rich-text";
import { ShareButtons } from "@/components/news/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getEventBySlug, isUpcoming } from "@/lib/data/events";
import { formatDate, formatTimeRange } from "@/lib/dates/format";
import { getSiteUrl, jsonLd, localizedPath, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const e = await getEventBySlug(locale, slug);
  if (!e) return {};
  return pageMetadata({
    locale,
    path: `/events/${e.slug}`,
    title: e.title,
    description: e.summary,
    image: e.coverUrl,
  });
}

export default async function EventDetailPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const e = await getEventBySlug(locale, slug);
  if (!e) notFound();

  const t = await getTranslations("Events");
  const start = new Date(e.startsAt);
  const time = formatTimeRange(locale, start, e.endsAt);
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}${localizedPath(locale, `/events/${e.slug}`)}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`;
  const past = !isUpcoming(e);

  const facts = [
    { icon: CalendarDays, label: t("date"), value: formatDate(locale, start, "full") },
    { icon: Clock, label: t("time"), value: time },
    { icon: MapPin, label: t("location"), value: e.location },
  ];

  const structured = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.summary,
    startDate: e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.location, address: e.location },
    image:
      e.coverUrl && !e.coverUrl.endsWith(".svg")
        ? [`${siteUrl}${e.coverUrl}`]
        : [`${siteUrl}/og-default.png`],
    organizer: { "@type": "Organization", name: "130 UNICEF клуб", url: siteUrl },
    url,
  };

  return (
    <article className="container-page max-w-5xl py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
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
              <div key={label} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
                <dt className="contents">
                  <span className="row-span-2 flex size-10 items-center justify-center rounded-xl bg-background text-brand-purple-strong">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                </dt>
                <dd className="font-semibold">{value}</dd>
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
