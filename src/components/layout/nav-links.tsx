"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mainNav } from "@/config/site";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

type NavKeyT = (typeof mainNav)[number]["key"] | "join";
const hrefOf = (key: NavKeyT) =>
  key === "join" ? "/join" : mainNav.find((i) => i.key === key)!.href;

/**
 * Desktop navigation. Grouped so the header fits next to the full club name at 1280px:
 * "Мэдээ" holds news + gallery, "Оролцох" holds support + join. Home is the logo link.
 */
const desktopNav: ({ key: NavKeyT } | { group: "newsGroup" | "getInvolved"; items: NavKeyT[] })[] =
  [
    { key: "about" },
    { key: "impact" },
    { group: "newsGroup", items: ["news", "gallery"] },
    { key: "events" },
    { key: "members" },
    { group: "getInvolved", items: ["support", "join", "faq"] },
    { key: "contact" },
  ];

const linkCls = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground/75 transition-colors hover:bg-muted hover:text-foreground",
    active && "bg-brand-cyan-soft text-foreground",
  );

export function NavLinks({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul className={cn("flex items-center gap-0.5", className)}>
      {desktopNav.map((entry) => {
        if ("key" in entry) {
          const href = hrefOf(entry.key);
          const active = isActive(pathname, href);
          return (
            <li key={entry.key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={linkCls(active)}
              >
                {t(entry.key)}
              </Link>
            </li>
          );
        }
        const active = entry.items.some((k) => isActive(pathname, hrefOf(k)));
        return (
          <li key={entry.group}>
            <DropdownMenu>
              <DropdownMenuTrigger className={linkCls(active)}>
                {t(entry.group)}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {entry.items.map((k) => {
                  const href = hrefOf(k);
                  return (
                    <DropdownMenuItem key={k} asChild>
                      <Link
                        href={href}
                        aria-current={isActive(pathname, href) ? "page" : undefined}
                      >
                        {t(k)}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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
