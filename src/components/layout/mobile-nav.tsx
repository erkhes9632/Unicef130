"use client";

import { Menu } from "lucide-react";
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

export function MobileNav() {
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
        <div className="p-4">
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
