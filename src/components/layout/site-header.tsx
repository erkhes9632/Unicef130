import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeaderAccount } from "@/components/auth/header-account";
import { HeaderCta, headerCtaTarget } from "@/components/auth/header-cta";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations();
  const cta = await headerCtaTarget();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur [view-transition-name:site-header] supports-backdrop-filter:bg-background/75 print:hidden">
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 xl:h-[4.5rem]">
        {/* Name = the lockup text + "Нүүр" (no aria-label: WCAG 2.5.3 "label in name"). On phones
            and at lg the title is visually hidden but still read out. */}
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandLockup variant="header" />
          <span className="sr-only"> — {t("Nav.home")}</span>
        </Link>

        <nav aria-label={t("Nav.label")} className="mx-auto hidden lg:block">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t("Common.search")}
            className="hidden lg:inline-flex"
          >
            <Link href="/search" title={t("Common.search")}>
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <LocaleSwitcher />
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <HeaderCta className="ml-1.5 hidden lg:inline-flex" />
          <HeaderAccount />
          <MobileNav
            cta={{ kind: cta.kind, label: cta.kind === "admin" ? t("Auth.menuAdmin") : cta.label }}
          />
        </div>
      </div>
    </header>
  );
}
