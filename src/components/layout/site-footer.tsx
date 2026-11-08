import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SocialIcon, socialTitle } from "@/components/brand/social-icon";
import { mainNav } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/data/settings";

export async function SiteFooter() {
  const t = await getTranslations();
  const { contact, socials } = await getSiteSettings();
  const visibleSocials = socials.filter((s) => s.url);
  const year = new Date().getFullYear();

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
          <BrandLockup size={44} />
          <p className="max-w-xs text-sm text-muted-foreground">{t("Footer.about")}</p>
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

        <div>
          <h2 className="mb-3 text-sm font-bold">{t("Footer.contact")}</h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-brand-cyan-strong"
                aria-hidden="true"
              />
              <span>{contact.address}</span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan-strong" aria-hidden="true" />
              <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                {contact.email}
              </a>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan-strong" aria-hidden="true" />
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-foreground">
                {contact.phone}
              </a>
            </li>
          </ul>
        </div>

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
          {visibleSocials.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-bold">{t("Footer.follow")}</h2>
              <ul className="flex gap-2">
                {visibleSocials.map((s) => (
                  <li key={s.platform}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={socialTitle(s.platform)}
                      className="flex size-10 items-center justify-center rounded-full bg-background text-foreground/80 ring-1 ring-border transition-colors hover:bg-brand-cyan-soft hover:text-foreground"
                    >
                      <SocialIcon platform={s.platform} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("Footer.rights", { year })}</p>
          {/* TODO(content): confirm wording of the UNICEF affiliation disclaimer. */}
          <p>{t("Footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
