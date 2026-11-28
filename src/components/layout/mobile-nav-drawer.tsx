"use client";

import { ArrowRight, Search, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { ctaKind, type CtaLabels } from "@/components/auth/header-cta";
import { useHeaderSession } from "@/components/auth/use-header-session";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { LocaleChoice } from "./locale-switcher";
import { MobileNavLinks } from "./nav-links";
import { ThemeChoice } from "./theme-toggle";

/**
 * The drawer itself (Radix dialog: focus trap, scroll lock, Escape, focus back to the menu
 * button). Loaded the first time the menu opens, so pages don't ship it up front.
 */
export function MobileNavDrawer({
  open,
  onOpenChange,
  returnFocus,
  labels,
  showFaq,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Focus goes back to the menu button when the drawer closes. */
  returnFocus: () => void;
  labels: CtaLabels;
  showFaq: boolean;
}) {
  const t = useTranslations();
  const { signedIn, role } = useHeaderSession();
  const kind = ctaKind(signedIn, role);
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocus();
        }}
        side="right"
        className="w-[88vw] max-w-sm gap-0 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="font-heading text-lg">{t("Common.clubName")}</SheetTitle>
          <SheetDescription>{t("Common.brandPair")}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-2">
          {kind === "admin" ? (
            <Button asChild size="lg" variant="secondary" className="w-full">
              {/* Full page load: /admin needs the account-area CSP (lib/auth/account-paths.ts). */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full page load */}
              <a href="/admin" onClick={close}>
                <ShieldCheck aria-hidden="true" /> {labels.admin}
              </a>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              variant={kind === "me" ? "secondary" : "default"}
              className="w-full"
            >
              <Link href={kind === "me" ? "/me" : "/join"} onClick={close}>
                {kind === "me" && <UserRound aria-hidden="true" />}
                {kind === "me" ? labels.me : labels.join}
                {kind === "join" && <ArrowRight aria-hidden="true" />}
              </Link>
            </Button>
          )}
        </div>
        <nav aria-label={t("Nav.label")} className="px-2 py-2">
          <MobileNavLinks onNavigate={close} showFaq={showFaq} />
        </nav>
        <div className="space-y-2 border-t p-4">
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/search" onClick={close}>
              <Search aria-hidden="true" /> {t("Common.search")}
            </Link>
          </Button>
          <LocaleChoice />
          <ThemeChoice />
        </div>
      </SheetContent>
    </Sheet>
  );
}
