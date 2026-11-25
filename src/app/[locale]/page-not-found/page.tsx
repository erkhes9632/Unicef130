import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/common/not-found-content";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/page-not-found">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The shared 404 page (one cached page per language). worker.ts answers unknown URLs with it and
 * status 404, so a random URL costs a cache lookup instead of a full render (Free plan CPU).
 */
export default async function SharedNotFound({ params }: PageProps<"/[locale]/page-not-found">) {
  await resolveLocale(params);
  const t = await getTranslations("Common");
  return <NotFoundContent homeLink={<Link href="/">{t("backHome")}</Link>} />;
}
