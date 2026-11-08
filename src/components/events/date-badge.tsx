import { getLocale } from "next-intl/server";
import { formatDate } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

/** Calendar-page style date: month on top, big day number. */
export async function DateBadge({ date, className }: { date: string; className?: string }) {
  const locale = await getLocale();
  const d = new Date(date);
  return (
    <div
      className={cn(
        "flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-card text-center ring-1 ring-border",
        className,
      )}
    >
      <span className="w-full bg-brand-cyan py-1 text-[11px] font-bold text-brand-night">
        {formatDate(locale, d, "monthShort")}
      </span>
      <span className="py-1.5 font-heading text-2xl leading-none font-extrabold">
        {formatDate(locale, d, "day")}
      </span>
    </div>
  );
}
