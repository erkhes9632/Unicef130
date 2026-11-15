import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { clerkPublishableKey } from "@/lib/auth/clerk";
import { AFTER_SIGN_IN_PATH, SIGN_IN_PATH } from "@/lib/auth/roles";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in/[[...sign-in]]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("signInTitle"), robots: { index: false, follow: false } };
}

/** One screen for everyone: Google or an e-mail code; a first sign-in creates the account. */
export default async function SignInPage({
  params,
}: PageProps<"/[locale]/sign-in/[[...sign-in]]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Auth");
  const path = `${locale === "en" ? "/en" : ""}${SIGN_IN_PATH}`;
  return (
    <div className="container-page flex flex-1 flex-col items-center gap-6 py-10 sm:py-16">
      {clerkPublishableKey() ? (
        <SignIn
          routing="path"
          path={path}
          withSignUp
          fallbackRedirectUrl={`${AFTER_SIGN_IN_PATH}?locale=${locale}`}
        />
      ) : (
        <p role="status" className="max-w-md rounded-2xl bg-muted/60 p-6 text-center">
          {t("unavailable")}
        </p>
      )}
      <p className="max-w-md text-center text-xs text-muted-foreground">{t("privacyNote")}</p>
    </div>
  );
}
