import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PrintButton } from "@/components/me/print-button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requireMember } from "@/lib/auth/session";
import { getClubNames } from "@/lib/branding";
import { formatDate, formatNumber } from "@/lib/dates/format";
import { getMyMemberPage } from "@/lib/members/data";
import { schoolYearOf } from "@/lib/school-year";

// Per visitor (session / query string): never cached, unlike the public pages.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/me/certificate">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Certificate" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Participation certificate for the signed-in member (their own data only), made to be printed
 * or saved as PDF from the browser's print dialog.
 */
export default async function CertificatePage({
  params,
  searchParams,
}: PageProps<"/[locale]/me/certificate">) {
  const locale = await resolveLocale(params);
  const me = await requireMember(locale);
  const t = await getTranslations("Certificate");
  const sp = await searchParams;
  const [page, names] = await Promise.all([getMyMemberPage(me.id, locale), getClubNames(locale)]);
  const year =
    typeof sp.year === "string" && page.totals.some((y) => y.schoolYear === sp.year)
      ? sp.year
      : (page.totals[0]?.schoolYear ?? schoolYearOf(new Date()));
  const hours = page.totals.find((y) => y.schoolYear === year)?.hours ?? 0;

  if (!page.member || hours <= 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="mb-3 text-3xl font-extrabold">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("nothing")}</p>
        <Link href="/me" className="mt-4 inline-block font-semibold underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page flex flex-col items-center gap-6 py-10 print:p-0">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton label={t("print")} />
        {page.totals.length > 1 && (
          <nav aria-label={t("years")} className="flex gap-2 text-sm">
            {page.totals.map((y) => (
              <Link
                key={y.schoolYear}
                href={{ pathname: "/me/certificate", query: { year: y.schoolYear } }}
                aria-current={y.schoolYear === year ? "page" : undefined}
                className="rounded-full px-3 py-1 ring-1 ring-border aria-[current=page]:bg-brand-cyan-soft"
              >
                {y.schoolYear}
              </Link>
            ))}
          </nav>
        )}
        <Link href="/me" className="text-sm underline">
          {t("back")}
        </Link>
      </div>

      <article className="flex aspect-[1.414] w-full max-w-4xl flex-col items-center justify-between rounded-3xl border-8 border-double border-brand-cyan bg-white p-8 text-center text-slate-900 shadow-sm sm:p-12 print:max-w-none print:rounded-none print:shadow-none">
        {/* White paper in every theme and in print: always the light file. */}
        <BrandLogo
          variant="stacked"
          locale={locale === "en" ? "en" : "mn"}
          alt=""
          height={112}
          tone="light"
        />
        <div className="space-y-4">
          <p className="text-sm font-bold tracking-[0.3em] text-sky-700 uppercase">{names.name}</p>
          <h1 className="font-heading text-3xl font-extrabold sm:text-5xl">{t("heading")}</h1>
          <p className="text-lg">{t("awardedTo")}</p>
          <p className="font-heading text-3xl font-extrabold sm:text-4xl">{page.member.name}</p>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed">
            {t("body", { year, hours: formatNumber(hours) })}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-10 pt-6 text-sm">
          <div className="border-t border-slate-400 pt-2">{t("signLeader")}</div>
          <div className="border-t border-slate-400 pt-2">{t("signAdvisor")}</div>
        </div>
        <p className="text-xs text-slate-500">
          {t("issued", { date: formatDate(locale, new Date(), "long") })}
        </p>
      </article>
    </div>
  );
}
