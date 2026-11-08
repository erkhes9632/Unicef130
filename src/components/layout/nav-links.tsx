"use client";

import { useTranslations } from "next-intl";
import { mainNav } from "@/config/site";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation links with active-state highlighting. */
export function NavLinks({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {mainNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-brand-cyan-soft text-foreground",
              )}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical list used inside the mobile menu sheet. */
export function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {mainNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-2xl px-4 py-3 text-base font-semibold transition-colors hover:bg-muted",
                active && "bg-brand-cyan-soft",
              )}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
