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

type AdminNavItem = { href: string; label: string; icon: LucideIcon };

/** The admin menu, grouped the way the club thinks about its work. */
const adminGroups: { title: string | null; items: AdminNavItem[] }[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Хяналтын самбар", icon: LayoutDashboard }],
  },
  {
    title: "Агуулга",
    items: [
      { href: "/admin/news", label: "Мэдээ", icon: Newspaper },
      { href: "/admin/events", label: "Арга хэмжээ", icon: CalendarDays },
      { href: "/admin/gallery", label: "Зургийн цомог", icon: Images },
      { href: "/admin/pages/about", label: "Бидний тухай", icon: FileText },
      { href: "/admin/pages/support", label: "Дэмжих хуудас", icon: HandHeart },
      { href: "/admin/faq", label: "Түгээмэл асуулт", icon: HelpCircle },
    ],
  },
  {
    title: "Гишүүд",
    items: [
      { href: "/admin/members", label: "Гишүүд", icon: Users },
      { href: "/admin/hours", label: "Сайн дурын цаг", icon: Clock },
      { href: "/admin/recruitment", label: "Элсэлт", icon: DoorOpen },
      { href: "/admin/applications", label: "Өргөдлүүд", icon: Inbox },
    ],
  },
  {
    title: "Тайлан",
    items: [{ href: "/admin/impact", label: "Жилийн үр дүн", icon: BarChart3 }],
  },
  {
    title: "Бусад",
    items: [
      { href: "/admin/settings", label: "Сайтын тохиргоо", icon: Settings },
      { href: "/admin/users", label: "Хэрэглэгчид", icon: UserCog },
    ],
  },
];

/** Every admin page (the ⌘K palette lists them). */
export const adminNav: AdminNavItem[] = adminGroups.flatMap((g) => g.items);

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
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground",
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
    <div className="space-y-5">
      {adminGroups.map((g) => (
        <div key={g.title ?? "home"}>
          {g.title && (
            <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {g.title}
            </p>
          )}
          <ul className="space-y-0.5">{g.items.map(item)}</ul>
        </div>
      ))}
    </div>
  );
}
