import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { clerkPublishableKey } from "@/lib/auth/clerk";
import { getClubNames } from "@/lib/branding";
import { AccountMenu } from "@/components/auth/account-menu";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { name: clubName } = await getClubNames(locale);
  const accountLabels = {
    signIn: t("Auth.signIn"),
    admin: t("Auth.menuAdmin"),
    me: t("Auth.menuMe"),
    application: t("Auth.menuApplication"),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur [view-transition-name:site-header] supports-backdrop-filter:bg-background/70 print:hidden">
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 xl:h-[4.5rem]">
        <Link
          href="/"
          aria-label={`${clubName} — ${t("Nav.home")}`}
          className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandLockup
            size={36}
            className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex"
          />
        </Link>

        <nav aria-label={t("Nav.label")} className="mx-auto hidden xl:block">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-0.5 xl:ml-0">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t("Common.search")}
            className="hidden sm:inline-flex"
          >
            <Link href="/search" title={t("Common.search")}>
              <Search className="size-5" aria-hidden="true" />
              <span className="sr-only">{t("Common.search")}</span>
            </Link>
          </Button>
          <LocaleSwitcher />
          <ThemeToggle />
          {/* At xl the grouped nav already has "Оролцох → Гишүүн болох"; the button returns at 2xl. */}
          <Button asChild className="ml-1 hidden sm:inline-flex xl:hidden 2xl:inline-flex">
            <Link href="/join">{t("Common.joinCta")}</Link>
          </Button>
          {clerkPublishableKey() && <AccountMenu labels={accountLabels} locale={locale} />}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
