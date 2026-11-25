import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { ProfileCard } from "@/components/me/profile-card";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { SIGN_IN_PATH } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

// Per visitor (session): never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/me/profile">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Me.profile" });
  return { title: t("pageTitle"), robots: { index: false, follow: false } };
}

/**
 * «Миний мэдээлэл» for every signed-in person, applicants included (they have no /me yet: the
 * /join status page links here). Members and admins also have the same card on /me.
 */
export default async function MyProfilePage({ params }: PageProps<"/[locale]/me/profile">) {
  const locale = await resolveLocale(params);
  const me = await getCurrentUser();
  if (!me) redirect(`${locale === "en" ? "/en" : ""}${SIGN_IN_PATH}`);
  const t = await getTranslations("Me.profile");
  const back = me.role ? "/me" : "/join";
  return (
    <>
      <PageHero title={t("pageTitle")} description={t("intro")} />
      <div className="container-page max-w-2xl space-y-6 py-10 sm:py-14">
        <ProfileCard userId={me.id} role={me.role} locale={locale} />
        <Button asChild variant="outline">
          <Link href={back}>← {t("back")}</Link>
        </Button>
      </div>
    </>
  );
}
