import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SocialLinks } from "@/components/brand/social-links";
import { mainNav } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, publicContact } from "@/lib/data/settings";

export async function SiteFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { contact, socials, club } = await getSiteSettings();
  const info = publicContact(locale, contact);
  const about = pick(locale, club.description, club.descriptionEn) || t("Footer.about");
  const year = new Date().getFullYear();
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
    <footer className="relative mt-auto overflow-hidden border-t bg-muted/40">
      {/* Colorful brand stripe */}
      <div aria-hidden="true" className="flex h-1.5">
        <span className="flex-1 bg-brand-cyan" />
        <span className="flex-1 bg-brand-purple" />
        <span className="flex-1 bg-brand-green" />
        <span className="flex-1 bg-brand-blue" />
        <span className="flex-1 bg-brand-gold" />
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-1">
          <BrandLockup size={44} wrapText />
          <p className="max-w-xs text-sm text-muted-foreground">{about}</p>
        </div>

        <nav aria-label={t("Footer.explore")}>
          <h2 className="mb-3 text-sm font-bold">{t("Footer.explore")}</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                  {t(`Nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {contactLines.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-bold">{t("Footer.contact")}</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {contactLines.map(({ key, icon: Icon, text, href }) => (
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
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-bold">{t("Footer.getInvolved")}</h2>
          <div className="flex flex-col items-start gap-3 text-sm">
            <Link href="/join" className="font-semibold text-brand-cyan-strong hover:underline">
              {t("Nav.join")} →
            </Link>
            <Link
              href="/support"
              className="font-semibold text-brand-purple-strong hover:underline"
            >
              {t("Nav.support")} →
            </Link>
          </div>
          {socials.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-bold">{t("Footer.follow")}</h2>
              <SocialLinks socials={socials} variant="icons" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("Footer.rights", { year })}</p>
          <p>{t("Footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
