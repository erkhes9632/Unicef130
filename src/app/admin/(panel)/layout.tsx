import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette } from "@/components/admin/command-palette";
import { ThemeToggleAdmin } from "@/components/admin/theme-toggle-admin";
import { UnsavedChangesGuard } from "@/components/admin/unsaved-changes-guard";
import { AccountMenu } from "@/components/auth/account-menu";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SIGN_IN_PATH } from "@/lib/auth/roles";
import { getAdminAccess } from "@/lib/auth/session";

const accountLabels = {
  signIn: "Нэвтрэх",
  admin: "Админ",
  me: "Миний хэсэг",
  application: "Өргөдөл",
};

/**
 * Protected admin shell. Every page below is server-checked here AND in each Server Action.
 * A signed-in non-admin gets an explanation instead of the panel (the pages never render).
 */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const access = await getAdminAccess();
  if (access.status === "signed-out") redirect(SIGN_IN_PATH);
  if (access.status === "forbidden") return <AdminForbidden user={access.user} />;
  const { user } = access;

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b p-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandLogo variant="mark" locale="mn" alt="" height={40} />
            <span className="flex flex-col leading-tight">
              <span className="font-heading font-extrabold">Клуб 130</span>
              <span className="text-xs text-muted-foreground">Админ</span>
            </span>
          </Link>
        </div>
        <nav aria-label="Админ цэс" className="flex-1 overflow-y-auto p-3">
          <AdminNav />
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Сайт руу очих <ExternalLink className="size-3" />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
          <AdminMobileNav />
          {/* Sidebar collapsed (below lg): the mark only. */}
          <Link
            href="/admin"
            aria-label="Клуб 130 — Админ"
            className="flex shrink-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
          >
            <BrandLogo variant="mark" locale="mn" alt="" height={40} />
          </Link>
          <CommandPalette />
          <UnsavedChangesGuard />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold">{user.name || user.email}</p>
              <p className="text-muted-foreground">{user.email} · Админ</p>
            </div>
            <ThemeToggleAdmin />
            <AccountMenu labels={accountLabels} />
          </div>
        </header>
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
