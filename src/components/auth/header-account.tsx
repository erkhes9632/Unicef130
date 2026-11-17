import { auth } from "@clerk/nextjs/server";
import { LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { clerkPublishableKey } from "@/lib/auth/clerk";
import { toRole } from "@/lib/auth/roles";
import { AccountDropdown, type AccountLink } from "./account-dropdown";

/**
 * Header account control for public pages, rendered on the server from the session the
 * middleware already verified — no Clerk code in the browser. Signed out: "Нэвтрэх" link.
 * Signed in: a menu with links for the role and "Гарах" (/sign-out loads Clerk to sign out).
 * Links only help navigation: every page checks the role itself.
 */
export async function HeaderAccount() {
  if (!clerkPublishableKey()) return null;
  const t = await getTranslations("Auth");
  let signedIn = false;
  let role: ReturnType<typeof toRole> = null;
  try {
    const session = await auth();
    signedIn = !!session.userId;
    role = toRole(session.sessionClaims?.role);
  } catch {
    // No Clerk context for this request (e.g. a static error page): show the sign-in link.
  }

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
    <AccountDropdown
      links={links}
      label={t("accountMenu")}
      signOut={{ href: "/sign-out", label: t("signOut") }}
    />
  );
}
