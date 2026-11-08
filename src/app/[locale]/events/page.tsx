import { CalendarDays, CalendarX2, List } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { MonthCalendar } from "@/components/events/month-calendar";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { getEventsInMonth, listEvents } from "@/lib/data/events";
import { parseMonth } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";

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

const tabClass = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
    active
      ? "bg-background shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:text-foreground",
  );

export default async function EventsPage({ params, searchParams }: PageProps<"/[locale]/events">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const scope = sp.tab === "past" ? "past" : "upcoming";
  const t = await getTranslations("Events");

  const { year, month } = parseMonth(sp.month);
  const [items, monthEvents] = await Promise.all([
    view === "list" ? listEvents(locale, scope) : Promise.resolve([]),
    view === "calendar" ? getEventsInMonth(locale, year, month) : Promise.resolve([]),
  ]);

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
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-full bg-muted p-1">
            <Link
              href="/events"
              className={tabClass(view === "list")}
              aria-current={view === "list" ? "page" : undefined}
            >
              <List className="size-4" aria-hidden="true" /> {t("listView")}
            </Link>
            <Link
              href={{ pathname: "/events", query: { view: "calendar" } }}
              className={tabClass(view === "calendar")}
              aria-current={view === "calendar" ? "page" : undefined}
            >
              <CalendarDays className="size-4" aria-hidden="true" /> {t("calendarView")}
            </Link>
          </div>
          {view === "list" && (
            <div className="inline-flex w-fit rounded-full bg-muted p-1">
              <Link
                href="/events"
                className={tabClass(scope === "upcoming")}
                aria-current={scope === "upcoming" ? "page" : undefined}
              >
                {t("upcoming")}
              </Link>
              <Link
                href={{ pathname: "/events", query: { tab: "past" } }}
                className={tabClass(scope === "past")}
                aria-current={scope === "past" ? "page" : undefined}
              >
                {t("past")}
              </Link>
            </div>
          )}
        </div>

        {view === "calendar" ? (
          <div className="space-y-8">
            <MonthCalendar year={year} month={month} events={monthEvents} />
            {monthEvents.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {monthEvents.map((e) => (
                  <EventCard key={e.id} item={e} />
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarX2} title={t("emptyMonth")} />
            )}
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((e) => (
              <EventCard key={e.id} item={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarX2}
            title={scope === "upcoming" ? t("emptyUpcoming") : t("emptyPast")}
          />
        )}
      </Section>
    </>
  );
}
