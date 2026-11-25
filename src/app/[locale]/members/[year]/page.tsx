import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { MembersView, membersMetadata } from "../members-view";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/members/[year]">): Promise<Metadata> {
  const { year } = await params;
  return membersMetadata(await resolveLocale(params), year);
}

export default async function MembersYearPage({ params }: PageProps<"/[locale]/members/[year]">) {
  const { year } = await params;
  return <MembersView locale={await resolveLocale(params)} requested={year} />;
}
