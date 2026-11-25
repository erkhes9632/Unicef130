import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { JoinView, joinMetadata } from "./join-view";

// Signed-in visitors only (the proxy rewrites signed-out ones to /join/guest): per user.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/join">): Promise<Metadata> {
  return joinMetadata(await resolveLocale(params));
}

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  return <JoinView locale={await resolveLocale(params)} signedIn />;
}
