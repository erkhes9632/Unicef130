import { LogIn, ShieldCheck } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getHeaderSession } from "@/lib/auth/header-session";
import { AccountDropdown, type AccountLink } from "./account-dropdown";

/**
 * Header account control for public pages, rendered on the server — no Clerk code in the
 * browser. Signed out: "Нэвтрэх" link. Signed in: a menu with links for the role and "Гарах"
 * (/sign-out loads Clerk to sign out). Admins also get a visible "Админ" button.
 */
export async function HeaderAccount() {
  const session = await getHeaderSession();
  if (!session) return null;
  const t = await getTranslations("Auth");
  const { signedIn, role } = session;

  if (!signedIn) {
    return (
      <Button asChild variant="outline" className="ml-1">
        <Link href="/sign-in">
          <LogIn aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t("signIn")}</span>
        </Link>
      </Button>
    );
  }

  const links: AccountLink[] = [
    ...(role === "admin"
      ? [{ href: "/admin", label: t("menuAdmin"), icon: "admin" as const }]
      : []),
    role
      ? { href: "/me", label: t("menuMe"), icon: "me" as const, localized: true }
      : {
          href: "/join",
          label: t("menuApplication"),
          icon: "application" as const,
          localized: true,
        },
  ];
  return (
    <>
      {role === "admin" && (
        <Button asChild variant="outline" className="ml-1 hidden sm:inline-flex">
          <NextLink href="/admin" prefetch={false}>
            <ShieldCheck aria-hidden="true" />
            {t("adminButton")}
          </NextLink>
        </Button>
      )}
      <AccountDropdown
        links={links}
        label={t("accountMenu")}
        signOut={{ href: "/sign-out", label: t("signOut") }}
      />
    </>
  );
}
