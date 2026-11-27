"use client";

import { useTranslations } from "next-intl";
import { mainNav } from "@/config/site";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NavDisclosure } from "./nav-disclosure";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

type NavKeyT = (typeof mainNav)[number]["key"] | "join";
const hrefOf = (key: NavKeyT) =>
  key === "join" ? "/join" : mainNav.find((i) => i.key === key)!.href;

/**
 * Desktop navigation (from `lg`): five entries, three of them small menus, so the header never
 * crowds — «Бидний тухай» (about, members), «Мэдээ» (news, gallery), «Оролцох» (join, support,
 * FAQ). Home is the logo link. FAQ is left out while no question is published (`showFaq`).
 */
type Group = "aboutGroup" | "newsGroup" | "getInvolved";
const desktopNav: ({ key: NavKeyT } | { group: Group; items: NavKeyT[] })[] = [
  { group: "aboutGroup", items: ["about", "members"] },
  { key: "impact" },
  { group: "newsGroup", items: ["news", "gallery"] },
  { key: "events" },
  { group: "getInvolved", items: ["join", "support", "faq"] },
];

/** Mobile drawer: the same structure as titled sections. */
const mobileNav: { title?: Group; items: NavKeyT[] }[] = [
  { items: ["home", "impact", "events"] },
  { title: "aboutGroup", items: ["about", "members"] },
  { title: "newsGroup", items: ["news", "gallery"] },
  { title: "getInvolved", items: ["join", "support", "faq"] },
];

const visible = (items: NavKeyT[], showFaq: boolean) =>
  showFaq ? items : items.filter((k) => k !== "faq");

const linkCls = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-foreground/80 transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
    active && "bg-brand-cyan-soft text-brand-cyan-strong",
  );

export function NavLinks({ className, showFaq }: { className?: string; showFaq: boolean }) {
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
        const items = visible(entry.items, showFaq);
        const active = items.some((k) => isActive(pathname, hrefOf(k)));
        return (
          <li key={entry.group}>
            <NavDisclosure label={t(entry.group)} className={linkCls(active)}>
              {items.map((k) => {
                const href = hrefOf(k);
                const current = isActive(pathname, href);
                return (
                  <li key={k}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-muted focus-visible:bg-muted",
                        current && "text-brand-cyan-strong",
                      )}
                    >
                      {t(k)}
                    </Link>
                  </li>
                );
              })}
            </NavDisclosure>
          </li>
        );
      })}
    </ul>
  );
}

/** Grouped list used inside the mobile menu sheet. */
export function MobileNavLinks({
  onNavigate,
  showFaq,
}: {
  onNavigate?: () => void;
  showFaq: boolean;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {mobileNav.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <p className="px-4 pb-1 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {t(section.title)}
            </p>
          )}
          <ul className="flex flex-col">
            {visible(section.items, showFaq).map((key) => {
              const href = hrefOf(key);
              const active = isActive(pathname, href);
              return (
                <li key={key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-2xl px-4 text-base font-semibold transition-colors hover:bg-muted",
                      active && "bg-brand-cyan-soft text-brand-cyan-strong",
                    )}
                  >
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
