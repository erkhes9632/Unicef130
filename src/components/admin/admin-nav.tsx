"use client";

import {
  BarChart3,
  DoorOpen,
  CalendarDays,
  Clock,
  Images,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Newspaper,
  ScrollText,
  FileText,
  HelpCircle,
  Settings,
  Activity,
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
  { href: "/admin/messages", label: "Зурвасууд", icon: Mail },
  { href: "/admin/impact", label: "Жилийн үр дүн", icon: BarChart3 },
  { href: "/admin/pages/about", label: "Бидний тухай хуудас", icon: FileText },
  { href: "/admin/faq", label: "Түгээмэл асуулт", icon: HelpCircle },
  { href: "/admin/settings", label: "Сайтын тохиргоо", icon: Settings },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UserCog },
  { href: "/admin/audit", label: "Үйлдлийн түүх", icon: ScrollText },
  { href: "/admin/system", label: "Системийн төлөв", icon: Activity },
];

/** Admin menu (only admins reach the panel; every page checks the role on the server). */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {adminNav.map(({ href, label, icon: Icon }) => {
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
