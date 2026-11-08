import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { ThemeToggleAdmin } from "@/components/admin/theme-toggle-admin";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { roleLabels } from "@/lib/auth/roles";
import { logoutAction } from "../actions";

/** Protected admin shell. Every page below is server-checked here AND in each Server Action. */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="border-b p-4">
          <Link href="/admin">
            <BrandLockup
              size={28}
              className="[&_span]:text-[11px] [&>span:last-child>span:first-child]:text-sm"
            />
          </Link>
        </div>
        <nav aria-label="Админ цэс" className="flex-1 overflow-y-auto p-3">
          <AdminNav isAdmin={isAdmin} />
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
          <AdminMobileNav isAdmin={isAdmin} />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold">{user.name}</p>
              <p className="text-muted-foreground">
                {user.email} · {roleLabels[user.role]}
              </p>
            </div>
            <ThemeToggleAdmin />
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut /> Гарах
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
