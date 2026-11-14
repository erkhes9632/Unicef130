import { Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { isUpcoming, type EventItem } from "@/lib/data/events";
import { formatDateRange, formatTimeRange } from "@/lib/dates/format";
import { DateBadge } from "./date-badge";

export async function EventCard({ item }: { item: EventItem }) {
  const t = await getTranslations("Events");
  const locale = await getLocale();
  const past = !isUpcoming(item);
  const time = item.allDay
    ? item.endsAt
      ? formatDateRange(locale, item.startsAt, item.endsAt)
      : null
    : formatTimeRange(locale, item.startsAt, item.endsAt);

  return (
    <article className="group relative flex gap-4 rounded-3xl bg-card p-4 ring-1 ring-border transition-shadow hover:shadow-lg hover:shadow-brand-purple/10 sm:p-5">
      <DateBadge date={item.startsAt} />
      <div className="min-w-0 flex-1 space-y-2">
        {past && (
          <Badge variant="outline" className="rounded-full">
            {t("pastBadge")}
          </Badge>
        )}
        <h3 className="leading-snug font-bold sm:text-lg">
          <Link
            href={`/events/${item.slug}`}
            className="after:absolute after:inset-0 hover:text-brand-purple-strong"
          >
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-brand-purple-strong" aria-hidden="true" />
              {time}
            </span>
          )}
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 text-brand-purple-strong" aria-hidden="true" />
              {item.location}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
