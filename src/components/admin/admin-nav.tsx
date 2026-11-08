"use client";

import {
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Newspaper,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Хяналтын самбар", icon: LayoutDashboard },
  { href: "/admin/news", label: "Мэдээ", icon: Newspaper },
  { href: "/admin/events", label: "Арга хэмжээ", icon: CalendarDays },
  { href: "/admin/members", label: "Гишүүд", icon: Users },
  { href: "/admin/gallery", label: "Зургийн цомог", icon: Images },
  { href: "/admin/applications", label: "Өргөдлүүд", icon: Inbox },
  { href: "/admin/messages", label: "Зурвасууд", icon: Mail },
  { href: "/admin/settings", label: "Сайтын тохиргоо", icon: Settings, adminOnly: true },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UserCog, adminOnly: true },
];

export function AdminNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {adminNav
        .filter((item) => isAdmin || !item.adminOnly)
        .map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-brand-cyan-soft text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
    </ul>
  );
}
