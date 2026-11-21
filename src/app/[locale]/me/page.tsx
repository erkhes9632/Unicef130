import { Award, CalendarCheck, CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { PageHero } from "@/components/common/page-hero";
import { ClassForm, DeleteMyAccount, SignupButton } from "@/components/me/me-client";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireMember } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate, formatNumber } from "@/lib/dates/format";
import { getMyMemberPage } from "@/lib/members/data";
import { activeProgress, schoolYearOf } from "@/lib/members/logic";

export async function generateMetadata({ params }: PageProps<"/[locale]/me">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Member area: only the signed-in member's own data (middleware + this guard). */
export default async function MePage({ params }: PageProps<"/[locale]/me">) {
  const locale = await resolveLocale(params);
  const me = await requireMember(locale);
  const t = await getTranslations("Me");
  const [page, settings] = await Promise.all([getMyMemberPage(me.id, locale), getSiteSettings()]);
  const year = schoolYearOf(new Date());
  const thisYear = page.totals.find((y) => y.schoolYear === year)?.hours ?? 0;
  const threshold = settings.membership.activeMemberHours;
  const progress = activeProgress(thisYear, threshold);
  const hours = (n: number) => t("hours", { n: formatNumber(n) });

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={page.member?.name ? t("greeting", { name: page.member.name }) : t("title")}
        description={t("intro")}
      />
      <div className="container-page grid gap-6 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section
            aria-labelledby="me-hours"
            className="space-y-4 rounded-[2rem] bg-card p-6 ring-1 ring-border"
          >
            <h2 id="me-hours" className="flex items-center gap-2 text-xl font-extrabold">
              <Clock className="size-5 text-brand-cyan-strong" aria-hidden="true" />
              {t("hoursTitle")}
            </h2>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p>
                <span className="block font-heading text-4xl font-extrabold">
                  {hours(thisYear)}
                </span>
                <span className="text-sm text-muted-foreground">{t("thisYear", { year })}</span>
              </p>
              {page.totals
                .filter((y) => y.schoolYear !== year)
                .map((y) => (
                  <p key={y.schoolYear} className="text-sm">
                    <span className="font-bold">{hours(y.hours)}</span>{" "}
                    <span className="text-muted-foreground">{y.schoolYear}</span>
                  </p>
                ))}
            </div>
            {progress !== null && threshold && (
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{t("activeGoal")}</span>
                  <span>
                    {formatNumber(thisYear)} / {formatNumber(threshold)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("activeGoal")}
                  className="h-3 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progress >= 100 && (
                  <p className="mt-2 text-sm font-semibold text-brand-green-strong">
                    {t("activeReached")}
                  </p>
                )}
              </div>
            )}
            {page.totals.some((y) => y.hours > 0) && (
              <Link
                href="/me/certificate"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-cyan-strong underline"
              >
                <Award className="size-4" aria-hidden="true" /> {t("certificate")}
              </Link>
            )}
            {page.history.length === 0 && !page.importedTotal ? (
              <p className="text-sm text-muted-foreground">{t("noHours")}</p>
            ) : (
              <ul className="divide-y text-sm">
                {page.history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {h.event ?? (h.note || t("hoursEntry"))}
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(locale, h.date, "long")}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">{hours(h.hours)}</span>
                  </li>
                ))}
                {page.importedTotal && (
                  <li className="flex justify-between gap-3 py-2">
                    <span>{t("importedTotal", { year: page.importedTotal.schoolYear })}</span>
                    <span className="shrink-0 font-semibold">
                      {hours(page.importedTotal.hours)}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="me-events"
            className="space-y-4 rounded-[2rem] bg-card p-6 ring-1 ring-border"
          >
            <h2 id="me-events" className="flex items-center gap-2 text-xl font-extrabold">
              <CalendarDays className="size-5 text-brand-purple-strong" aria-hidden="true" />
              {t("upcomingTitle")}
            </h2>
            {page.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
            ) : (
              <ul className="space-y-3">
                {page.upcoming.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-4"
                  >
                    <div className="min-w-0">
                      <Link href={`/events/${e.slug}`} className="font-bold hover:underline">
                        {e.title}
                      </Link>
                      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>
                          {formatDate(locale, e.startsAt, "long")}{" "}
                          {formatDate(locale, e.startsAt, "time")}
                        </span>
                        {e.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden="true" /> {e.location}
                          </span>
                        )}
                        {e.placesLeft !== null && (
                          <span>{t("placesLeft", { count: e.placesLeft })}</span>
                        )}
                      </p>
                      {e.myStatus === "registered" && (
                        <p className="mt-1 text-xs font-semibold text-brand-green-strong">
                          {t("youAreRegistered")}
                        </p>
                      )}
                      {e.myStatus === "waitlist" && (
                        <p className="mt-1 text-xs font-semibold text-brand-gold-strong">
                          {t("youAreWaitlisted")}
                        </p>
                      )}
                    </div>
                    <SignupButton eventId={e.id} status={e.myStatus} open={e.open} />
                  </li>
                ))}
              </ul>
            )}
            {page.attended.length > 0 && (
              <>
                <h3 className="flex items-center gap-2 pt-2 font-bold">
                  <CalendarCheck className="size-4" aria-hidden="true" /> {t("attendedTitle")}
                </h3>
                <ul className="divide-y text-sm">
                  {page.attended.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 py-2">
                      <Link href={`/events/${e.slug}`} className="hover:underline">
                        {e.title}
                      </Link>
                      <span className="text-muted-foreground">
                        {formatDate(locale, e.startsAt, "long")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section
            aria-labelledby="me-profile"
            className="space-y-4 rounded-3xl bg-brand-cyan-soft p-6"
          >
            <h2 id="me-profile" className="flex items-center gap-2 font-bold">
              <UserRound className="size-5 text-brand-cyan-strong" aria-hidden="true" />
              {t("profileTitle")}
            </h2>
            {page.member ? (
              <>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("name")}</dt>
                    <dd className="font-semibold">{page.member.name}</dd>
                  </div>
                  {page.member.team && (
                    <div>
                      <dt className="text-muted-foreground">{t("team")}</dt>
                      <dd className="font-semibold">{page.member.team}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">{t("memberSince")}</dt>
                    <dd className="font-semibold">
                      {page.member.schoolYear ?? formatDate(locale, page.member.since, "long")}
                    </dd>
                  </div>
                </dl>
                <ClassForm className={page.member.className} />
                <p className="text-xs text-muted-foreground">{t("profileHint")}</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <BrandLockup variant="stacked" height={140} />
                <p className="text-sm text-muted-foreground">{t("noMemberRecord")}</p>
              </div>
            )}
          </section>
          <section aria-labelledby="me-account" className="space-y-3 rounded-3xl bg-muted/60 p-6">
            <h2 id="me-account" className="font-bold">
              {t("accountTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{me.email}</p>
            <DeleteMyAccount
              disabledReason={me.role === "admin" ? t("adminCannotDelete") : undefined}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
