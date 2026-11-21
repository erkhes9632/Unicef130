import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SocialLinks } from "@/components/brand/social-links";
import { mainNav } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getClubNames } from "@/lib/branding";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, publicContact } from "@/lib/data/settings";
import { ubParts } from "@/lib/dates/ub-time";
import { cn } from "@/lib/utils";

const LINK =
  "inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground sm:min-h-9";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { contact, socials, club } = await getSiteSettings();
  const info = publicContact(locale, contact);
  const about = pick(locale, club.description, club.descriptionEn) || t("Footer.about");
  // Ulaanbaatar year (the Worker runs in UTC: 1 January starts 8 hours earlier here).
  const { year } = ubParts(new Date());
  const { name: clubName } = await getClubNames(locale);
  const icon = "mt-0.5 size-4 shrink-0 text-brand-cyan-strong";
  const contactLines = [
    info.address && { key: "address", icon: MapPin, text: info.address },
    info.email && { key: "email", icon: Mail, text: info.email, href: `mailto:${info.email}` },
    info.phone && {
      key: "phone",
      icon: Phone,
      text: info.phone,
      href: `tel:${info.phone.replace(/[^\d+]/g, "")}`,
    },
    info.officeHours && { key: "hours", icon: Clock, text: info.officeHours },
  ].filter((l) => !!l);

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
              .filter((item) => !["support", "faq", "contact"].includes(item.key))
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
            <li>
              <Link href="/faq" className={LINK}>
                {t("Nav.faq")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={LINK}>
                {t("Nav.contact")}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-2 text-sm font-bold">{t("Footer.contact")}</h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {contactLines.length > 0 ? (
              contactLines.map(({ key, icon: Icon, text, href }) => (
                <li key={key} className="flex gap-2">
                  <Icon className={icon} aria-hidden="true" />
                  {href ? (
                    <a href={href} className="break-words hover:text-foreground">
                      {text}
                    </a>
                  ) : (
                    <span>{text}</span>
                  )}
                </li>
              ))
            ) : (
              // No contact details set in the admin yet: only what is certain (no invented data).
              <li className="flex gap-2">
                <MapPin className={icon} aria-hidden="true" />
                <span>{t("Footer.schoolPlace")}</span>
              </li>
            )}
            <li>
              <Link href="/contact" className={cn(LINK, "font-semibold text-brand-cyan-strong")}>
                {t("Footer.writeToUs")} →
              </Link>
            </li>
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
