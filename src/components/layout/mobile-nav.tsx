"use client";

import { Menu, Search, ShieldCheck } from "lucide-react";
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
import { MobileNavLinks } from "./nav-links";

/**
 * `adminLabel` is set by the server for admins (D1 role): it only adds a shortcut to /admin,
 * which checks the role itself.
 */
export function MobileNav({ adminLabel }: { adminLabel?: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("Nav.openMenu")}>
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg">{t("Common.clubName")}</SheetTitle>
          <SheetDescription>{t("Common.brandPair")}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t("Nav.label")} className="px-2">
          <MobileNavLinks onNavigate={() => setOpen(false)} />
        </nav>
        <div className="space-y-2 p-4">
          {adminLabel && (
            <Button asChild variant="secondary" size="lg" className="w-full">
              <NextLink href="/admin" prefetch={false}>
                <ShieldCheck /> {adminLabel}
              </NextLink>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/search" onClick={() => setOpen(false)}>
              <Search /> {t("Common.search")}
            </Link>
          </Button>
          <Button asChild size="lg" className="w-full">
            <Link href="/join" onClick={() => setOpen(false)}>
              {t("Common.joinCta")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
