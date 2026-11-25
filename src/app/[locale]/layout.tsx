import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { PageTransition } from "@/components/layout/page-transition";
import { RevealObserver } from "@/components/layout/reveal-observer";
import { RootDocument, rootIcons, rootViewport } from "@/components/layout/root-document";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { baseClientNamespaces } from "@/i18n/client-namespaces";
import { routing } from "@/i18n/routing";
import { getClubNames } from "@/lib/branding";
import { getSiteSettings } from "@/lib/data/settings";
import { getSiteUrl, jsonLd } from "@/lib/seo";

import "../globals.css";

/**
 * Public site root. Pages are ISR: nothing is prerendered at build time (the build has no
 * production data); each page is rendered on its first visit, then served from the cache and
 * refreshed in the background (hourly for time-dependent parts like "upcoming events", and on
 * every admin edit via revalidateTag — see lib/admin/revalidate.ts).
 */
export function generateStaticParams() {
  return [];
}
export const revalidate = 3600;
export const viewport: Viewport = rootViewport;

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const loc = locale as "mn" | "en";
  const [t, names] = await Promise.all([
    getTranslations({ locale: loc, namespace: "Metadata" }),
    getClubNames(loc),
  ]);
  return {
    metadataBase: new URL(await getSiteUrl()),
    title: { default: names.name, template: `%s | ${names.short}` },
    description: t("description"),
    applicationName: names.short,
    icons: rootIcons,
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Common");
  const [siteUrl, settings, messages] = await Promise.all([
    getSiteUrl(),
    getSiteSettings(),
    getMessages(),
  ]);
  // Only ship the namespaces that client components use (keeps the HTML/RSC payload small).
  const clientMessages = Object.fromEntries(
    baseClientNamespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  );
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.club.name || "130-р сургуулийн UNICEF клуб",
    alternateName: settings.club.nameEn || "UNICEF Club of School No. 130",
    url: siteUrl,
    logo: `${siteUrl}/brand/favicon-512.png`,
    ...(settings.club.foundedYear ? { foundingDate: String(settings.club.foundedYear) } : {}),
    parentOrganization: { "@type": "EducationalOrganization", name: "130-р сургууль" },
    ...(settings.contact.email ? { email: settings.contact.email } : {}),
    sameAs: settings.socials.map((s) => s.url),
  };

  return (
    <RootDocument lang={locale}>
      <NextIntlClientProvider messages={clientMessages}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <AnnouncementBanner />
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
        <RevealObserver />
      </NextIntlClientProvider>
    </RootDocument>
  );
}
