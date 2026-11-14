import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="container-page flex h-16 min-w-0 items-center gap-2 sm:gap-3 xl:h-[4.5rem]">
        <Link
          href="/"
          aria-label={`${t("Common.clubName")} — ${t("Nav.home")}`}
          className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandLockup
            size={36}
            className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex xl:[&>span:last-child]:hidden 2xl:[&>span:last-child]:flex"
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
          <Button asChild className="ml-1 hidden sm:inline-flex">
            <Link href="/join">{t("Common.joinCta")}</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
