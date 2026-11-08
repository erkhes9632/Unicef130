import { siteConfig } from "@/config/site";
import { routing, type Locale } from "@/i18n/routing";
import { getEventBySlug } from "@/lib/data/events";
import { buildIcs } from "@/lib/dates/ics";

/** iCalendar download for "Add to calendar". */
export async function GET(request: Request, ctx: RouteContext<"/api/events/[slug]/ics">) {
  const { slug } = await ctx.params;
  const lang = new URL(request.url).searchParams.get("lang");
  const locale: Locale = (routing.locales as readonly string[]).includes(lang ?? "")
    ? (lang as Locale)
    : "mn";
  const event = await getEventBySlug(locale, slug);
  if (!event) return new Response("Not found", { status: 404 });

  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const ics = buildIcs({
    uid: `${event.id}@unicef-club-130`,
    title: event.title,
    description: event.summary,
    location: event.location,
    start: new Date(event.startsAt),
    end: event.endsAt
      ? new Date(event.endsAt)
      : new Date(Date.parse(event.startsAt) + 60 * 60 * 1000),
    url: new URL(`${prefix}/events/${event.slug}`, siteConfig.url).toString(),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
