import { Mail, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SocialIcon } from "@/components/brand/social-icon";
import { SocialLinks } from "@/components/brand/social-links";
import { CopyButton } from "@/components/contact/copy-button";
import { mainNav } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getClubNames } from "@/lib/branding";
import { hasPublishedFaqs } from "@/lib/data/faq";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, publicContact } from "@/lib/data/settings";
import { ubParts } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";

const LINK =
  "inline-flex min-h-11 min-w-11 items-center text-muted-foreground hover:text-foreground";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { contact, socials, club } = await getSiteSettings();
  const info = publicContact(locale, contact);
  const about = pick(locale, club.description, club.descriptionEn) || t("Footer.about");
  // Ulaanbaatar year (the Worker runs in UTC: 1 January starts 8 hours earlier here).
  const { year } = ubParts(new Date());
  const { name: clubName } = await getClubNames(locale);
  const showFaq = await hasPublishedFaqs();
  const icon = "size-4 text-brand-cyan-strong";
  // One row per channel: icon column + text column on one grid, links as large as the text.
  const contactLink =
    "inline-flex min-h-11 items-center break-all text-brand-cyan-strong underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm sm:min-h-0";

  return (
    <footer className="relative mt-auto overflow-hidden border-t bg-surface-2 print:hidden">
      {/* Colorful brand stripe */}
      <div aria-hidden="true" className="flex h-[3px]">
        <span className="flex-1 bg-brand-cyan" />
        <span className="flex-1 bg-brand-purple" />
        <span className="flex-1 bg-brand-sun" />
        <span className="flex-1 bg-brand-coral" />
        <span className="flex-1 bg-brand-green" />
      </div>

      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          {/* The club name is visible next to the logo, so the logo itself is decorative. */}
          <div className="flex items-center gap-4">
            <BrandLockup variant="stacked" height={120} decorative />
            <p className="font-heading text-base leading-snug font-extrabold text-balance">
              {clubName}
            </p>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">{about}</p>
          {socials.length > 0 && (
            <div>
              <h2 className="sr-only">{t("Footer.follow")}</h2>
              <SocialLinks socials={socials} variant="icons" />
            </div>
          )}
        </div>

        <nav aria-label={t("Footer.explore")}>
          <h2 className="mb-2 text-sm font-bold">{t("Footer.explore")}</h2>
          <ul className="grid grid-cols-2 gap-x-4 text-sm">
            {mainNav
              .filter((item) => !["support", "faq"].includes(item.key))
              .map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={LINK}>
                    {t(`Nav.${item.key}`)}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <nav aria-label={t("Footer.getInvolved")}>
          <h2 className="mb-2 text-sm font-bold">{t("Footer.getInvolved")}</h2>
          <ul className="text-sm">
            <li>
              <Link href="/join" className={cn(LINK, "font-semibold text-brand-cyan-strong")}>
                {t("Nav.join")} →
              </Link>
            </li>
            <li>
              <Link href="/support" className={cn(LINK, "font-semibold text-brand-purple-strong")}>
                {t("Nav.support")} →
              </Link>
            </li>
            {showFaq && (
              <li>
                <Link href="/faq" className={LINK}>
                  {t("Nav.faq")}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div id="contact" className="scroll-mt-24">
          <h2 className="mb-2 text-sm font-bold">{t("Footer.contact")}</h2>
          <ul className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:gap-y-2.5">
            <li className="contents">
              <MapPin className={icon} aria-hidden="true" />
              <span className="py-1 text-pretty">{info.address || t("Footer.schoolPlace")}</span>
            </li>
            {info.email && (
              <li className="contents">
                <Mail className={icon} aria-hidden="true" />
                <span className="flex min-w-0 items-center gap-1">
                  <a href={`mailto:${info.email}`} className={contactLink}>
                    {info.email}
                  </a>
                  <CopyButton
                    value={info.email}
                    label={t("Footer.copyEmail")}
                    copied={t("Footer.copied")}
                    className="-my-2 size-9"
                  />
                </span>
              </li>
            )}
            {info.instagram && (
              <li className="contents">
                <SocialIcon platform="instagram" className={icon} />
                <a
                  href={info.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactLink}
                >
                  {info.instagram.handle}
                  <span className="sr-only"> (Instagram, {t("Common.newTab")})</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("Footer.rights", { year, name: clubName })} <span aria-hidden="true">·</span>{" "}
            <Link
              href="/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("Footer.privacy")}
            </Link>
          </p>
          <p>{t("Footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
