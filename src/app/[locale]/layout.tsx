import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { HtmlLangSync } from "@/components/layout/html-lang-sync";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";
import { getBranding } from "@/lib/branding";
import { getSiteSettings } from "@/lib/data/settings";
import { getSiteUrl, jsonLd } from "@/lib/seo";

/** Message namespaces used by client components ("use client" + useTranslations). */
const clientNamespaces = [
  "Common",
  "Nav",
  "Theme",
  "Locale",
  "Forms",
  "Share",
  "Gallery",
  "Errors",
] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "mn" | "en", namespace: "Metadata" });
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Common");
  const [siteUrl, settings, messages, branding] = await Promise.all([
    getSiteUrl(),
    getSiteSettings(),
    getMessages(),
    getBranding(locale),
  ]);
  // Only ship the namespaces that client components use (keeps the HTML/RSC payload small).
  const clientMessages = Object.fromEntries(
    clientNamespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  );
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.club.name || "130 UNICEF клуб",
    alternateName: settings.club.nameEn || "130 UNICEF Club",
    url: siteUrl,
    ...(branding.schoolLogo ? { logo: new URL(branding.schoolLogo, siteUrl).toString() } : {}),
    ...(settings.club.foundedYear ? { foundingDate: String(settings.club.foundedYear) } : {}),
    parentOrganization: { "@type": "EducationalOrganization", name: "130-р сургууль" },
    ...(settings.contact.email ? { email: settings.contact.email } : {}),
    sameAs: settings.socials.map((s) => s.url),
  };

  return (
    <NextIntlClientProvider messages={clientMessages}>
      <HtmlLangSync locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </NextIntlClientProvider>
  );
}
