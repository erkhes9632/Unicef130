import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeaderAccount } from "@/components/auth/header-account";
import { HeaderCta } from "@/components/auth/header-cta";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { hasPublishedFaqs } from "@/lib/data/faq";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations();
  const showFaq = await hasPublishedFaqs();
  // Role labels; the role itself is known only in the browser (cached page, see role-hint.ts).
  const ctaLabels = {
    join: t("Common.joinCta"),
    me: t("Auth.menuMe"),
    admin: t("Auth.adminButton"),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background [view-transition-name:site-header] md:bg-background/90 md:backdrop-blur md:supports-backdrop-filter:bg-background/75 print:hidden">
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 xl:h-[4.5rem]">
        {/* Name = the logo's alt (club name, as drawn in the wordmark) + "Нүүр". Horizontal logo
            from lg, compact below; the locale-aware Link goes to this locale's home page. The
            desktop nav starts at xl: at lg the 44 px logo and the nav don't fit on one row. */}
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="hidden lg:block">
            <BrandLockup variant="horizontal" height={44} priority />
          </span>
          <span className="lg:hidden">
            <BrandLockup variant="compact" height={32} priority />
          </span>
          <span className="sr-only"> — {t("Nav.home")}</span>
        </Link>

        <nav aria-label={t("Nav.label")} className="mx-auto hidden xl:block">
          <NavLinks showFaq={showFaq} />
        </nav>

        <div className="ml-auto flex items-center gap-0.5 xl:ml-0">
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
          {/* Below 360 px the compact logo needs the room: language stays in the drawer. */}
          <span className="hidden min-[360px]:inline-flex">
            <LocaleSwitcher />
          </span>
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <HeaderCta labels={ctaLabels} className="ml-1.5 hidden lg:inline-flex" />
          <HeaderAccount />
          <MobileNav labels={{ ...ctaLabels, admin: t("Auth.menuAdmin") }} showFaq={showFaq} />
        </div>
      </div>
    </header>
  );
}
