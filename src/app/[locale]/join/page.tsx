import {
  Ban,
  CalendarClock,
  Check,
  CheckCircle2,
  Hourglass,
  ListOrdered,
  Lock,
  LogIn,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberAreaLink } from "@/components/auth/member-area-link";
import { Countdown } from "@/components/common/countdown";
import { PageHero } from "@/components/common/page-hero";
import { JoinForm } from "@/components/forms/join-form";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SIGN_IN_PATH } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { pick } from "@/lib/data/localize";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { getRecruitmentState, listMyApplications } from "@/lib/recruitment/data";
import {
  isCyrillicFullName,
  joinView,
  normalizeClass,
  publicStatus,
  type PublicStatus,
} from "@/lib/recruitment/logic";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

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

type MyApplication = Awaited<ReturnType<typeof listMyApplications>>[number];

const statusStyle: Record<PublicStatus, { icon: typeof Check; tone: string }> = {
  pending: { icon: Hourglass, tone: "bg-brand-cyan-soft text-brand-cyan-strong" },
  accepted: { icon: CheckCircle2, tone: "bg-brand-green-soft text-brand-green-strong" },
  rejected: { icon: XCircle, tone: "bg-muted text-muted-foreground" },
  waitlist: { icon: ListOrdered, tone: "bg-brand-gold-soft text-brand-gold-strong" },
};

/** The applicant's own application: public status + the admin's optional message. */
async function StatusCard({ app, locale }: { app: MyApplication; locale: Locale }) {
  const t = await getTranslations("Join");
  const status = publicStatus(app.status);
  const { icon: Icon, tone } = statusStyle[status];
  const steps = status === "pending" ? (t.raw("pendingSteps") as string[]) : [];
  const periodName = app.periodName ? pick(locale, app.periodName, app.periodNameEn) : "";
  return (
    <section
      aria-labelledby="my-status"
      className="flex flex-col items-start space-y-5 rounded-[2rem] bg-card p-6 shadow-soft ring-1 ring-border sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", tone)}>
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">
            {periodName ? `${periodName} · ` : ""}
            {t("submittedOn", { date: formatDate(locale, app.createdAt, "long") })}
          </p>
          <h2 id="my-status" className="text-2xl font-extrabold">
            {t(`status.${status}`)}
          </h2>
          <p className="mt-1 text-muted-foreground">{t(`statusBody.${status}`)}</p>
        </div>
      </div>
      {app.decisionMessage && (
        <blockquote className="w-full rounded-2xl bg-surface-2 p-4 text-sm whitespace-pre-line ring-1 ring-border">
          <p className="mb-1 font-semibold">{t("messageFromClub")}</p>
          {app.decisionMessage}
        </blockquote>
      )}
      {status !== "accepted" && (
        <Button asChild variant="outline">
          <Link href="/events">{t("seeEvents")}</Link>
        </Button>
      )}
      {steps.length > 0 && (
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const noticeTones = {
  cyan: "bg-brand-cyan-soft text-brand-cyan-strong",
  green: "bg-brand-green-soft text-brand-green-strong",
  purple: "bg-brand-purple-soft text-brand-purple-strong",
  coral: "bg-brand-coral-soft text-brand-coral-strong",
  muted: "bg-muted text-muted-foreground",
} as const;

/** One state of /join: icon, one sentence, one primary action. */
function Notice({
  icon: Icon,
  title,
  body,
  tone = "purple",
  children,
}: {
  icon: typeof Check;
  title: string;
  body: string;
  tone?: keyof typeof noticeTones;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-card p-6 text-center shadow-soft ring-1 ring-border sm:p-10">
      <span
        className={cn("flex size-16 items-center justify-center rounded-3xl", noticeTones[tone])}
      >
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="mt-1 text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Join");
  const tc = await getTranslations("Countdown");
  const [state, me, settings] = await Promise.all([
    getRecruitmentState(locale),
    getCurrentUser(),
    getSiteSettings(),
  ]);
  const mine = me ? await listMyApplications(me.id) : [];
  const open = state.phase === "open" ? state : null;
  const view = me
    ? joinView({
        role: me.role,
        applyBlocked: me.applyBlocked,
        open: open ? { id: open.period.id, intake: open.intake } : null,
        appliedPeriodIds: mine.map((a) => a.periodId),
      })
    : null;
  const current = open ? mine.find((a) => a.periodId === open.period.id) : undefined;
  const labels = {
    days: tc("days"),
    hours: tc("hours"),
    minutes: tc("minutes"),
    seconds: tc("seconds"),
  };
  const signInHref = `${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(
    `${locale === "en" ? "/en" : ""}/join`,
  )}`;
  const canApplyNow = open !== null && open.intake !== "full";

  const aside = (
    <aside className="space-y-4">
      {open && (
        <div className="rounded-3xl bg-brand-green-soft p-6">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <CalendarClock className="size-5 text-brand-green-strong" aria-hidden="true" />
            {t("openUntil", { date: formatDate(locale, open.closesAt, "long") })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("timeLeft")}: <Countdown to={open.closesAt} labels={labels} compact />
          </p>
          {open.placesLeft !== null && open.intake === "accept" && (
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-brand-green-strong" aria-hidden="true" />
              {t("placesLeft", { count: open.placesLeft })}
            </p>
          )}
        </div>
      )}
      <div className="rounded-3xl bg-brand-cyan-soft p-6">
        <h2 className="mb-4 text-xl font-extrabold">{t("whyTitle")}</h2>
        <ul className="space-y-3">
          {(t.raw("why") as string[]).map((w) => (
            <li key={w} className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0 text-brand-cyan-strong" aria-hidden="true" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl bg-surface-2 p-6 ring-1 ring-border">
        <h2 className="mb-2 flex items-center gap-2 font-bold">
          <ShieldCheck className="size-5 text-brand-green-strong" aria-hidden="true" />
          {t("privacyTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("privacy", { days: settings.membership.rejectedRetentionDays })}
        </p>
      </div>
    </aside>
  );

  const closedBlock =
    state.phase === "closed" && state.next ? (
      <Notice
        icon={CalendarClock}
        tone="purple"
        title={state.next.name}
        body={t("opensOn", {
          date: `${formatDate(locale, state.next.opensAt, "long")} ${formatDate(locale, state.next.opensAt, "time")}`,
        })}
      >
        <div className="w-full max-w-md">
          <Countdown to={state.next.opensAt} labels={labels} />
        </div>
      </Notice>
    ) : (
      <Notice
        icon={Lock}
        tone="muted"
        title={open ? t("fullTitle") : t("closedTitle")}
        body={open ? t("fullHint") : t("closedHint")}
      >
        <Button asChild>
          <Link href="/events">{t("seeEvents")}</Link>
        </Button>
      </Notice>
    );

  let main: React.ReactNode;
  if (!me) {
    main = canApplyNow ? (
      <Notice icon={LogIn} tone="cyan" title={t("signInFirstTitle")} body={t("signInFirstBody")}>
        <Button asChild size="lg">
          <Link href={signInHref}>
            <LogIn /> {t("signInToApply")}
          </Link>
        </Button>
      </Notice>
    ) : (
      closedBlock
    );
  } else if (view === "member") {
    main = (
      <Notice
        icon={CheckCircle2}
        tone="green"
        title={me.role === "admin" ? t("adminTitle") : t("memberTitle")}
        body={me.role === "admin" ? t("adminBody") : t("memberBody")}
      >
        <MemberAreaLink
          href={me.role === "admin" ? "/admin" : `${locale === "en" ? "/en" : ""}/me`}
        >
          {me.role === "admin" ? t("goToAdmin") : t("goToMe")}
        </MemberAreaLink>
      </Notice>
    );
  } else if (view === "status" && current) {
    main = <StatusCard app={current} locale={locale} />;
  } else if (view === "blocked") {
    main = (
      <Notice icon={Ban} tone="coral" title={t("blockedTitle")} body={t("blockedBody")}>
        <Button asChild variant="outline">
          <Link href="/contact">{t("contactUs")}</Link>
        </Button>
      </Notice>
    );
  } else if (view === "form" && open) {
    const name = me.name.trim();
    main = (
      <div className="rounded-[2rem] bg-card p-5 shadow-soft ring-1 ring-border sm:p-8">
        <JoinForm
          helpOptions={settings.helpOptions.map((o) => ({
            key: o.key,
            label: pick(locale, o.label, o.labelEn),
          }))}
          classes={open.period.classes.map(normalizeClass)}
          questions={open.questions}
          waitlist={open.intake === "waitlist"}
          accountEmail={me.email}
          defaultName={isCyrillicFullName(name) ? name : ""}
        />
      </div>
    );
  } else {
    // Closed (or full): show the latest decision too, if there is one.
    main = (
      <div className="space-y-6">
        {mine[0] && <StatusCard app={mine[0]} locale={locale} />}
        {closedBlock}
      </div>
    );
  }

  const heroTitle =
    view === "form" || (!me && canApplyNow)
      ? t("title")
      : view === "status" || view === "member"
        ? t("statusTitle")
        : open
          ? t("fullTitle")
          : t("closedTitle");
  const heroDescription =
    open && (view === "form" || !me)
      ? open.intro || t("description")
      : state.phase === "closed"
        ? state.message || t("closedBody")
        : t("description");

  return (
    <>
      <PageHero
        eyebrow={open?.name || t("eyebrow")}
        title={heroTitle}
        description={heroDescription}
      />
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
        <div>{main}</div>
        {aside}
      </div>
    </>
  );
}
