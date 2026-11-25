import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { MembersView, membersMetadata } from "./members-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/members">): Promise<Metadata> {
  return membersMetadata(await resolveLocale(params));
}

export default async function MembersPage({ params }: PageProps<"/[locale]/members">) {
  return <MembersView locale={await resolveLocale(params)} />;
}
