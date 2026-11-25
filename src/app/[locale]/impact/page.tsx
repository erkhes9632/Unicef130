import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { ImpactView, impactMetadata } from "./impact-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/impact">): Promise<Metadata> {
  return impactMetadata(await resolveLocale(params));
}

/** Latest school year. Older years live at /impact/[year] (cached pages, no query string). */
export default async function ImpactPage({ params }: PageProps<"/[locale]/impact">) {
  return <ImpactView locale={await resolveLocale(params)} />;
}
