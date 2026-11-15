"use client";

import {
  BarChart3,
  CircleUser,
  DoorOpen,
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Newspaper,
  ScrollText,
  FileText,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown only to roles with this permission (the pages enforce it on the server). */
  permission?: Permission;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Хяналтын самбар", icon: LayoutDashboard },
  { href: "/admin/news", label: "Мэдээ", icon: Newspaper, permission: "content" },
  { href: "/admin/events", label: "Арга хэмжээ", icon: CalendarDays, permission: "content" },
  { href: "/admin/gallery", label: "Зургийн цомог", icon: Images, permission: "content" },
  { href: "/admin/members", label: "Гишүүд", icon: Users, permission: "members" },
  { href: "/admin/recruitment", label: "Элсэлт", icon: DoorOpen, permission: "admin" },
  { href: "/admin/applications", label: "Өргөдлүүд", icon: Inbox, permission: "applications" },
  { href: "/admin/messages", label: "Зурвасууд", icon: Mail, permission: "messages" },
  { href: "/admin/impact", label: "Жилийн үр дүн", icon: BarChart3, permission: "admin" },
  { href: "/admin/pages/about", label: "Бидний тухай хуудас", icon: FileText, permission: "admin" },
  { href: "/admin/settings", label: "Сайтын тохиргоо", icon: Settings, permission: "admin" },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UserCog, permission: "admin" },
  { href: "/admin/audit", label: "Үйлдлийн түүх", icon: ScrollText, permission: "admin" },
  { href: "/admin/profile", label: "Миний профайл", icon: CircleUser },
];

export function AdminNav({
  granted,
  onNavigate,
}: {
  granted: readonly Permission[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {adminNav
        .filter((item) => !item.permission || granted.includes(item.permission))
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
