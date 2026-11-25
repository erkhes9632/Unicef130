import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { EventsBrowser } from "@/components/events/events-browser";
import { resolveLocale } from "@/i18n/locale";
import { listAllEvents } from "@/lib/data/events";
import { nowMs } from "@/lib/dates/ub-time";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Events" });
  return pageMetadata({
    locale,
    path: "/events",
    title: t("metaTitle"),
    description: t("description"),
  });
}

/** Cached page: all events are rendered once; list / calendar / tabs work in the browser. */
export default async function EventsPage({ params }: PageProps<"/[locale]/events">) {
  const locale = await resolveLocale(params);
  const [t, items] = await Promise.all([getTranslations("Events"), listAllEvents(locale)]);
  const plural = (count: number) => t("eventsOnDay", { count }).replace(String(count), "#");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        eyebrowColor="purple"
        title={t("title")}
        description={t("description")}
      />
      <Section className="pt-8 sm:pt-10">
        <h2 className="sr-only">{t("metaTitle")}</h2>
        <EventsBrowser
          locale={locale}
          renderedAt={nowMs()}
          events={items.map((e) => ({
            id: e.id,
            slug: e.slug,
            title: e.title,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
          }))}
          cards={Object.fromEntries(items.map((e) => [e.id, <EventCard key={e.id} item={e} />]))}
          joinCards={{
            upcoming: <JoinEmptyState title={t("emptyUpcoming")} />,
            past: <JoinEmptyState title={t("emptyPast")} />,
          }}
          labels={{
            listView: t("listView"),
            calendarView: t("calendarView"),
            upcoming: t("upcoming"),
            past: t("past"),
            emptyMonth: t("emptyMonth"),
            emptyUpcoming: t("emptyUpcoming"),
            emptyUpcomingHint: t("emptyUpcomingHint"),
            emptyUpcomingCta: t("emptyUpcomingCta"),
            emptyPast: t("emptyPast"),
            pastTitle: t("pastTitle"),
            allPast: t("allPast"),
            calendar: {
              prevMonth: t("prevMonth"),
              nextMonth: t("nextMonth"),
              today: t("today"),
              eventsOnDay: { one: plural(1), other: plural(2) },
              pastEvent: t("pastEvent"),
            },
          }}
        />
      </Section>
    </>
  );
}
