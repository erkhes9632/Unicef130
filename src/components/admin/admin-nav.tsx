"use client";

import {
  BarChart3,
  CalendarDays,
  Clock,
  DoorOpen,
  FileText,
  HandHeart,
  HelpCircle,
  Images,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Items of the "Бусад" group sit at the bottom, under a small heading. */
  group?: "other";
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Хяналтын самбар", icon: LayoutDashboard },
  { href: "/admin/news", label: "Мэдээ", icon: Newspaper },
  { href: "/admin/events", label: "Арга хэмжээ", icon: CalendarDays },
  { href: "/admin/gallery", label: "Зургийн цомог", icon: Images },
  { href: "/admin/members", label: "Гишүүд", icon: Users },
  { href: "/admin/hours", label: "Сайн дурын цаг", icon: Clock },
  { href: "/admin/recruitment", label: "Элсэлт", icon: DoorOpen },
  { href: "/admin/applications", label: "Өргөдлүүд", icon: Inbox },
  { href: "/admin/impact", label: "Жилийн үр дүн", icon: BarChart3 },
  { href: "/admin/pages/about", label: "Бидний тухай хуудас", icon: FileText },
  { href: "/admin/pages/support", label: "Дэмжих хуудас", icon: HandHeart },
  { href: "/admin/faq", label: "Түгээмэл асуулт", icon: HelpCircle },
  { href: "/admin/settings", label: "Сайтын тохиргоо", icon: Settings, group: "other" },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UserCog, group: "other" },
];

/** Admin menu (only admins reach the panel; every page checks the role on the server). */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon }: AdminNavItem) => {
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
  };
  return (
    <>
      <ul className="space-y-1">{adminNav.filter((i) => !i.group).map(item)}</ul>
      <p className="mt-6 mb-1 px-3 text-xs font-semibold text-muted-foreground">Бусад</p>
      <ul className="space-y-1">{adminNav.filter((i) => i.group === "other").map(item)}</ul>
    </>
  );
}
