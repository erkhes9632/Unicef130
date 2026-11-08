import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SocialIcon, socialTitle } from "@/components/brand/social-icon";
import { PageHero } from "@/components/common/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/data/settings";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Contact" });
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("description"),
  });
}

/** Only Google Maps embeds are allowed in the iframe. */
function safeMapUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      u.hostname === "www.google.com" &&
      u.pathname.startsWith("/maps/embed")
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  await resolveLocale(params);
  const t = await getTranslations("Contact");
  const { contact, socials } = await getSiteSettings();
  const visibleSocials = socials.filter((s) => s.url);
  const mapUrl = safeMapUrl(contact.mapEmbedUrl);
  const turnstileSiteKey = await getTurnstileSiteKey();

  const items = [
    { icon: MapPin, label: t("address"), value: contact.address },
    { icon: Mail, label: t("email"), value: contact.email, href: `mailto:${contact.email}` },
    {
      icon: Phone,
      label: t("phone"),
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    },
    { icon: Clock, label: t("hours"), value: contact.officeHours },
  ];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <ul className="space-y-3">
            {items.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cyan-soft text-brand-cyan-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      className="font-semibold break-words hover:text-brand-cyan-strong"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="font-semibold">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-3xl bg-muted/60 p-5">
            <h2 className="mb-3 font-bold">{t("social")}</h2>
            {visibleSocials.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {visibleSocials.map((s) => (
                  <li key={s.platform}>
                    <Button asChild variant="outline" size="sm" className="bg-background">
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        <SocialIcon platform={s.platform} className="size-3.5" />
                        {socialTitle(s.platform)}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSocial")}</p>
            )}
          </div>
        </aside>

        <div className="space-y-8">
          <section
            className="rounded-[2rem] bg-card p-5 ring-1 ring-border sm:p-8"
            aria-labelledby="contact-form-title"
          >
            <h2 id="contact-form-title" className="mb-6 text-2xl font-extrabold">
              {t("formTitle")}
            </h2>
            <ContactForm turnstileSiteKey={turnstileSiteKey} />
          </section>
          <section aria-labelledby="map-title">
            <h2 id="map-title" className="mb-4 text-2xl font-extrabold">
              {t("mapTitle")}
            </h2>
            {mapUrl ? (
              <iframe
                src={mapUrl}
                title={t("mapTitle")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[16/9] w-full rounded-[2rem] border-0 ring-1 ring-border"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed text-muted-foreground">
                <MapPin className="size-8" aria-hidden="true" />
                <p className="text-sm font-semibold">{t("mapPlaceholder")}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
