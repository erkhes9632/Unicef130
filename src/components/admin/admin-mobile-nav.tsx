"use client";

import { Menu } from "lucide-react";
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
import type { Permission } from "@/lib/auth/roles";
import { AdminNav } from "./admin-nav";

export function AdminMobileNav({ granted }: { granted: readonly Permission[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Цэс нээх">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Админ</SheetTitle>
          <SheetDescription>Админ хэсэг</SheetDescription>
        </SheetHeader>
        <nav aria-label="Админ цэс" className="px-3">
          <AdminNav granted={granted} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
