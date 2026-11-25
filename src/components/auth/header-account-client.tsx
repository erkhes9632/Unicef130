"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AccountDropdown, type AccountLink } from "./account-dropdown";
import { useHeaderSession } from "./use-header-session";

type Labels = {
  signIn: string;
  admin: string;
  me: string;
  application: string;
  account: string;
  signOut: string;
};

/** Signed out: "Нэвтрэх". Signed in: a menu with links for the role and "Гарах". */
export function HeaderAccountClient({ labels }: { labels: Labels }) {
  const { signedIn, role } = useHeaderSession();
  if (!signedIn) {
    return (
      <Button asChild variant="outline" className="ml-1">
        <Link href="/sign-in">
          <LogIn aria-hidden="true" />
          <span className="sr-only sm:not-sr-only lg:sr-only 2xl:not-sr-only">{labels.signIn}</span>
        </Link>
      </Button>
    );
  }
  const links: AccountLink[] = [
    ...(role === "admin" ? [{ href: "/admin", label: labels.admin, icon: "admin" as const }] : []),
    role === "admin" || role === "member"
      ? { href: "/me", label: labels.me, icon: "me" as const, localized: true }
      : { href: "/join", label: labels.application, icon: "application" as const, localized: true },
  ];
  return (
    <AccountDropdown
      links={links}
      label={labels.account}
      signOut={{ href: "/sign-out", label: labels.signOut }}
    />
  );
}
