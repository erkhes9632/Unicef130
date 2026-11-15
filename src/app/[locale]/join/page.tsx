import { CalendarClock, Check, Lock, Search, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Countdown } from "@/components/common/countdown";
import { PageHero } from "@/components/common/page-hero";
import { FormsUnavailable } from "@/components/forms/forms-unavailable";
import { JoinForm } from "@/components/forms/join-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pick } from "@/lib/data/localize";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";
import { getRecruitmentState } from "@/lib/recruitment/data";
import { issueFormToken } from "@/lib/recruitment/form-token";
import { normalizeClass } from "@/lib/recruitment/logic";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/join">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Join" });
  return pageMetadata({
    locale,
    path: "/join",
    title: t("metaTitle"),
    description: t("description"),
  });
}

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Join");
  const tc = await getTranslations("Countdown");
  const state = await getRecruitmentState(locale);
  const labels = {
    days: tc("days"),
    hours: tc("hours"),
    minutes: tc("minutes"),
    seconds: tc("seconds"),
  };
  const statusLink = (
    <Button asChild variant="outline">
      <Link href="/join/status">
        <Search /> {t("checkStatus")}
      </Link>
    </Button>
  );

  // Closed (no period is open) or the period's places are all taken.
  if (state.phase === "closed" || state.intake === "full") {
    const full = state.phase === "open";
    return (
      <>
        <PageHero
          eyebrow={t("eyebrow")}
          title={full ? t("fullTitle") : t("closedTitle")}
          description={full ? t("fullBody") : state.message || t("closedBody")}
        />
        <div className="container-page max-w-3xl space-y-6 py-10 sm:py-14">
          <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-card p-6 text-center ring-1 ring-border sm:p-10">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-purple-soft text-brand-purple-strong">
              {state.phase === "closed" && state.next ? (
                <CalendarClock className="size-8" aria-hidden="true" />
              ) : (
                <Lock className="size-8" aria-hidden="true" />
              )}
            </span>
            {state.phase === "closed" && state.next ? (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold">{state.next.name}</h2>
                  <p className="mt-1 text-muted-foreground">
                    {t("opensOn", {
                      date: `${formatDate(locale, state.next.opensAt, "long")} ${formatDate(locale, state.next.opensAt, "time")}`,
                    })}
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <Countdown to={state.next.opensAt} labels={labels} />
                </div>
              </>
            ) : (
              <p className="max-w-md text-muted-foreground">
                {full ? t("fullHint") : t("closedHint")}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/events">{t("seeEvents")}</Link>
              </Button>
              {statusLink}
            </div>
          </div>
        </div>
      </>
    );
  }

  const why = t.raw("why") as string[];
  const [turnstileSiteKey, settings, formToken] = await Promise.all([
    getTurnstileSiteKey(),
    getSiteSettings(),
    issueFormToken(),
  ]);
  const helpOptions = settings.helpOptions.map((o) => ({
    key: o.key,
    label: pick(locale, o.label, o.labelEn),
  }));

  return (
    <>
      <PageHero
        eyebrow={state.name || t("eyebrow")}
        title={t("title")}
        description={state.intro || t("description")}
      />
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-[2rem] bg-card p-5 ring-1 ring-border sm:p-8">
          {turnstileSiteKey ? (
            <JoinForm
              turnstileSiteKey={turnstileSiteKey}
              helpOptions={helpOptions}
              classes={state.period.classes.map(normalizeClass)}
              questions={state.questions}
              formToken={formToken}
              waitlist={state.intake === "waitlist"}
            />
          ) : (
            <FormsUnavailable />
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl bg-brand-green-soft p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <CalendarClock className="size-5 text-brand-green-strong" aria-hidden="true" />
              {t("openUntil", { date: formatDate(locale, state.closesAt, "long") })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("timeLeft")}: <Countdown to={state.closesAt} labels={labels} compact />
            </p>
            {state.placesLeft !== null && state.intake === "accept" && (
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-brand-green-strong" aria-hidden="true" />
                {t("placesLeft", { count: state.placesLeft })}
              </p>
            )}
            <div className="mt-4">{statusLink}</div>
          </div>
          <div className="rounded-3xl bg-brand-cyan-soft p-6">
            <h2 className="mb-4 text-xl font-extrabold">{t("whyTitle")}</h2>
            <ul className="space-y-3">
              {why.map((w) => (
                <li key={w} className="flex gap-3">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-brand-cyan-strong"
                    aria-hidden="true"
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-muted/60 p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <ShieldCheck className="size-5 text-brand-green-strong" aria-hidden="true" />
              {t("privacyTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("privacy")}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
