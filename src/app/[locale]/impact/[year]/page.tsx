import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { ImpactView, impactMetadata } from "../impact-view";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/impact/[year]">): Promise<Metadata> {
  const { year } = await params;
  return impactMetadata(await resolveLocale(params), year);
}

export default async function ImpactYearPage({ params }: PageProps<"/[locale]/impact/[year]">) {
  const { year } = await params;
  return <ImpactView locale={await resolveLocale(params)} requested={year} />;
}
