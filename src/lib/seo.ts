import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Public origin of the site. Order: SITE_URL var (set in production) → NEXT_PUBLIC_SITE_URL
 * (build time) → the current request's host. Never hard-code the domain.
 */
export const getSiteUrl = cache(async (): Promise<string> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.SITE_URL) return env.SITE_URL.replace(/\/+$/, "");
  } catch {
    // outside a request
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // no request (build time)
  }
  return "http://localhost:3000";
});

/** "/news" → "/news" (mn) or "/en/news" (en). */
export function localizedPath(locale: Locale, path: string) {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

export const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630 };

/** Per-page metadata with canonical URL, hreflang alternates and Open Graph defaults. */
export async function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  publishedTime,
  noIndex,
}: {
  locale: Locale;
  path: string;
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
}): Promise<Metadata> {
  const base = await getSiteUrl();
  const url = `${base}${localizedPath(locale, path)}`;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${base}${localizedPath(l, path)}`]),
  );
  const images = image && !image.endsWith(".svg") ? [{ url: image }] : [DEFAULT_OG_IMAGE];
  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: url,
      languages: { ...languages, "x-default": languages[routing.defaultLocale]! },
    },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: locale === "en" ? "130 UNICEF Club" : "130 UNICEF клуб",
      locale: locale === "en" ? "en_US" : "mn_MN",
      images,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Serializes JSON-LD safely for a <script> tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
