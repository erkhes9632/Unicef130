"use client";

import { ArrowRight, Menu, Search, ShieldCheck, UserRound } from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { LocaleChoice } from "./locale-switcher";
import { MobileNavLinks } from "./nav-links";
import { ThemeChoice } from "./theme-toggle";

/** The role button computed on the server (see `HeaderCta`); display only. */
export type DrawerCta = { kind: "join" | "me" | "admin"; label: string };

/** Drawer below `lg`: grouped links, the role button, search, language and theme. */
export function MobileNav({ cta }: { cta: DrawerCta }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("Nav.openMenu")}>
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg">{t("Common.clubName")}</SheetTitle>
          <SheetDescription>{t("Common.brandPair")}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-2">
          {cta.kind === "admin" ? (
            <Button asChild size="lg" variant="secondary" className="w-full">
              <NextLink href="/admin" prefetch={false} onClick={close}>
                <ShieldCheck aria-hidden="true" /> {cta.label}
              </NextLink>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              variant={cta.kind === "me" ? "secondary" : "default"}
              className="w-full"
            >
              <Link href={cta.kind === "me" ? "/me" : "/join"} onClick={close}>
                {cta.kind === "me" && <UserRound aria-hidden="true" />}
                {cta.label}
                {cta.kind === "join" && <ArrowRight aria-hidden="true" />}
              </Link>
            </Button>
          )}
        </div>
        <nav aria-label={t("Nav.label")} className="px-2 py-2">
          <MobileNavLinks onNavigate={close} />
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
