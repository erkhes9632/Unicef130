import { ArrowRight, Megaphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Countdown } from "@/components/common/countdown";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, safeExternalUrl } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { getRecruitmentState } from "@/lib/recruitment/data";

/**
 * Site-wide strip above the header. Shows the admin's announcement when one is switched on;
 * otherwise, while a recruitment period is open (and its banner is enabled), an automatic
 * "recruitment is open" message with a countdown.
 */
export async function AnnouncementBanner() {
  const locale = (await getLocale()) as Locale;
  const [{ announcement }, state] = await Promise.all([
    getSiteSettings(),
    getRecruitmentState(locale),
  ]);
  const t = await getTranslations("Banner");
  const manual = announcement.enabled ? pick(locale, announcement.text, announcement.textEn) : "";
  const auto = state.phase === "open" && state.period.showBanner && state.intake !== "full";
  if (!manual && !auto) return null;

  const base =
    "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm font-semibold";
  if (manual) {
    const href = announcement.href;
    const external = safeExternalUrl(href);
    const internal = href.startsWith("/") && !href.startsWith("//") ? href : null;
    const body = (
      <>
        <Megaphone className="size-4 shrink-0" aria-hidden="true" />
        <span>{manual}</span>
      </>
    );
    return (
      <aside aria-label={t("label")} className="bg-brand-gold text-brand-ink print:hidden">
        {external ? (
          <a
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} hover:underline`}
          >
            {body}
          </a>
        ) : internal ? (
          <Link href={internal} className={`${base} hover:underline`}>
            {body}
          </Link>
        ) : (
          <p className={base}>{body}</p>
        )}
      </aside>
    );
  }
  if (state.phase !== "open") return null;
  const tc = await getTranslations("Countdown");
  return (
    <aside aria-label={t("label")} className="bg-brand-cyan text-brand-ink print:hidden">
      {/* The 44 px link sets the strip's height (no negative margins over the wrapped text). */}
      <p className={base.replace("py-2", "py-0")}>
        <Megaphone className="size-4 shrink-0" aria-hidden="true" />
        <span className="sm:hidden">{t("recruitmentOpenShort")}</span>
        <span className="hidden sm:inline">
          {t("recruitmentOpen", { date: formatDate(locale, state.closesAt, "long") })}
        </span>
        <span className="hidden sm:inline">
          {t("timeLeft")}{" "}
          <Countdown
            to={state.closesAt}
            compact
            labels={{
              days: tc("days"),
              hours: tc("hours"),
              minutes: tc("minutes"),
              seconds: tc("seconds"),
            }}
          />
        </span>
        <Link
          href="/join"
          className="inline-flex min-h-11 items-center gap-1 font-bold underline underline-offset-4"
        >
          {t("cta")} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
    </aside>
  );
}
