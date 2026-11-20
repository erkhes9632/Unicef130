import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeaderAccount } from "@/components/auth/header-account";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getHeaderSession } from "@/lib/auth/header-session";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations();
  const session = await getHeaderSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur [view-transition-name:site-header] supports-backdrop-filter:bg-background/70 print:hidden">
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 xl:h-[4.5rem]">
        {/* Name = the lockup text + "Нүүр" (no aria-label: WCAG 2.5.3 "label in name"). On phones
            the text is visually hidden but still read out. */}
        <Link href="/" className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
          <BrandLockup
            size={36}
            className="[&>span:last-child]:sr-only sm:[&>span:last-child]:not-sr-only"
          />
          <span className="sr-only"> — {t("Nav.home")}</span>
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
          <HeaderAccount />
          <MobileNav adminLabel={session?.role === "admin" ? t("Auth.menuAdmin") : undefined} />
        </div>
      </div>
    </header>
  );
}
