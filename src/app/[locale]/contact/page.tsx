import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SocialLinks } from "@/components/brand/social-links";
import { PageHero } from "@/components/common/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { FormsUnavailable } from "@/components/forms/forms-unavailable";
import { ClientMessages } from "@/components/providers/client-messages";
import { formNamespaces } from "@/i18n/client-namespaces";
import { resolveLocale } from "@/i18n/locale";
import { getSiteSettings, publicContact } from "@/lib/data/settings";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";
import { pageMetadata } from "@/lib/seo";

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

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Contact");
  const { contact, socials } = await getSiteSettings();
  const info = publicContact(locale, contact);
  const turnstileSiteKey = await getTurnstileSiteKey();

  // Each line only when the admin filled it in.
  const items = [
    { icon: MapPin, label: t("address"), value: info.address },
    { icon: Mail, label: t("email"), value: info.email, href: `mailto:${info.email}` },
    {
      icon: Phone,
      label: t("phone"),
      value: info.phone,
      href: `tel:${info.phone.replace(/[^\d+]/g, "")}`,
    },
    { icon: Clock, label: t("hours"), value: info.officeHours },
  ].filter((i) => i.value);
  // Without admin contact details, only what is certain is shown (no invented data).
  if (items.length === 0)
    items.push({ icon: MapPin, label: t("address"), value: t("schoolPlace") });

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside aria-labelledby="contact-info-title" className="space-y-4">
          <h2 id="contact-info-title" className="text-2xl font-extrabold">
            {t("infoTitle")}
          </h2>
          <p className="text-muted-foreground">{t("infoBody")}</p>
          {items.length > 0 && (
            <ul className="space-y-3">
              {items.map(({ icon: Icon, label, value, href }) => (
                <li
                  key={label}
                  className="flex gap-3 rounded-3xl bg-card p-4 shadow-soft ring-1 ring-border"
                >
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
                      <p className="font-semibold whitespace-pre-line">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {socials.length > 0 && (
            <div className="rounded-3xl bg-surface-2 p-5 ring-1 ring-border">
              <h2 className="mb-3 font-bold">{t("social")}</h2>
              <SocialLinks socials={socials} variant="buttons" />
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-8">
          <section
            className="rounded-[2rem] bg-card p-5 shadow-soft ring-1 ring-border sm:p-8"
            aria-labelledby="contact-form-title"
          >
            <h2 id="contact-form-title" className="mb-6 text-2xl font-extrabold">
              {t("formTitle")}
            </h2>
            {turnstileSiteKey ? (
              <ClientMessages namespaces={formNamespaces}>
                <ContactForm turnstileSiteKey={turnstileSiteKey} />
              </ClientMessages>
            ) : (
              <FormsUnavailable />
            )}
          </section>
          {info.mapUrl && (
            <section aria-labelledby="map-title">
              <h2 id="map-title" className="mb-4 text-2xl font-extrabold">
                {t("mapTitle")}
              </h2>
              <iframe
                src={info.mapUrl}
                title={t("mapTitle")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[16/9] w-full rounded-[2rem] border-0 ring-1 ring-border"
                allowFullScreen
              />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
