import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SocialLinks } from "@/components/brand/social-links";
import { PageHero } from "@/components/common/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings, publicContact } from "@/lib/data/settings";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";
import { cn } from "@/lib/utils";

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
  const hasAside = items.length > 0 || socials.length > 0;

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div
        className={cn(
          "container-page grid gap-8 py-10 sm:py-14",
          hasAside && "lg:grid-cols-[22rem_1fr]",
        )}
      >
        {hasAside && (
          <aside className="space-y-4">
            {items.length > 0 && (
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
                        <p className="font-semibold whitespace-pre-line">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="rounded-3xl bg-muted/60 p-5">
                <h2 className="mb-3 font-bold">{t("social")}</h2>
                <SocialLinks socials={socials} variant="buttons" />
              </div>
            )}
          </aside>
        )}

        <div className={cn("space-y-8", !hasAside && "mx-auto w-full max-w-3xl")}>
          <section
            className="rounded-[2rem] bg-card p-5 ring-1 ring-border sm:p-8"
            aria-labelledby="contact-form-title"
          >
            <h2 id="contact-form-title" className="mb-6 text-2xl font-extrabold">
              {t("formTitle")}
            </h2>
            <ContactForm turnstileSiteKey={turnstileSiteKey} />
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
