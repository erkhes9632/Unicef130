import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignOutRunner } from "@/components/auth/sign-out-runner";
import { resolveLocale } from "@/i18n/locale";
import { clerkPublishableKey } from "@/lib/auth/clerk";
import { SIGN_IN_PATH } from "@/lib/auth/roles";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-out">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("signOut"), robots: { index: false, follow: false } };
}

/** "Гарах" from the public header: Clerk is loaded here (layout) only to end the session. */
export default async function SignOutPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-out">) {
  const locale = await resolveLocale(params);
  const home = locale === "en" ? "/en" : "/";
  if (!clerkPublishableKey()) redirect(home);
  // `?next=sign-in` ("sign out and in again" after a role change). Only this fixed value: no
  // open redirect.
  const next =
    (await searchParams).next === "sign-in"
      ? `${locale === "en" ? "/en" : ""}${SIGN_IN_PATH}`
      : home;
  const t = await getTranslations("Auth");
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <h1 className="text-3xl font-extrabold">{t("signOut")}</h1>
      <SignOutRunner home={next} label={t("signingOut")} />
    </div>
  );
}
