import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { JoinView, joinMetadata } from "../join-view";

/**
 * /join for signed-out visitors (the proxy rewrites them here; the address stays /join). The same
 * for every visitor, so it is cached like the public pages; recruitment changes revalidate it.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/join/guest">): Promise<Metadata> {
  return joinMetadata(await resolveLocale(params));
}

export default async function JoinGuestPage({ params }: PageProps<"/[locale]/join/guest">) {
  return <JoinView locale={await resolveLocale(params)} signedIn={false} />;
}
