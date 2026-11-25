import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  CalendarPlus,
  CircleAlert,
  CircleCheck,
  DoorOpen,
  ImagePlus,
  ListTodo,
  type LucideIcon,
  NewspaperIcon,
} from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatsDashboard } from "@/components/stats/stats-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { nowMs } from "@/lib/dates/ub-time";
import { dashboardTodos } from "@/lib/stats/dashboard";
import { siteStatus } from "@/lib/stats/status";

const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/news/new", label: "Мэдээ нэмэх", icon: NewspaperIcon },
  { href: "/admin/events/new", label: "Арга хэмжээ нэмэх", icon: CalendarPlus },
  { href: "/admin/gallery/new", label: "Зураг нэмэх", icon: ImagePlus },
  { href: "/admin/recruitment/new", label: "Элсэлт нээх", icon: DoorOpen },
];

/**
 * Хяналтын самбар: greeting, the site's status in plain words, what needs doing, quick actions,
 * the newest applications, then the statistics (drawn in the browser from small JSON). The
 * server part is two D1 batches (Free plan CPU budget).
 */
export default async function AdminDashboard() {
  const me = await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });
  const now = nowMs();
  const [status, { todos, latestApplications }] = await Promise.all([
    siteStatus(env.DB, now),
    dashboardTodos(env.DB, now),
  ]);

  return (
    <>
      <AdminPageHeader
        title={me.name ? `Сайн байна уу, ${me.name}!` : "Сайн байна уу!"}
        description="Клубын сайт ямар байгаа, юу хийх хэрэгтэйг энд харна."
      />

      <div className="space-y-6">
        <div role="status">
          {status.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-brand-green-soft p-4 font-semibold">
              <CircleCheck className="size-5 text-brand-green-strong" aria-hidden="true" />
              Сайт хэвийн ажиллаж байна
            </p>
          ) : (
            <ul className="space-y-2">
              {status.map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 rounded-2xl bg-brand-gold-soft p-4 font-semibold"
                >
                  <CircleAlert
                    className="mt-0.5 size-5 shrink-0 text-brand-gold-strong"
                    aria-hidden="true"
                  />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <section
          aria-labelledby="todo-title"
          className="rounded-2xl bg-card p-5 ring-1 ring-border"
        >
          <h2 id="todo-title" className="mb-3 flex items-center gap-2 font-bold">
            <ListTodo className="size-5 text-brand-cyan-strong" aria-hidden="true" /> Хийх зүйлс
          </h2>
          {todos.length === 0 ? (
            <p className="text-muted-foreground">Одоогоор хийх зүйл алга ✓</p>
          ) : (
            <ul className="divide-y">
              {todos.map((t) => (
                <li key={t.text} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{t.text}</span>
                  {t.href && (
                    <Link
                      href={t.href}
                      className="inline-flex min-h-11 items-center font-semibold text-brand-cyan-strong hover:underline"
                    >
                      {t.action} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav aria-label="Шуурхай үйлдэл">
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-auto w-full justify-start gap-3 py-4 text-base"
                >
                  <Link href={href}>
                    <Icon className="size-5 text-brand-cyan-strong" aria-hidden="true" />
                    {label}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="new-apps" className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="new-apps" className="font-bold">
              Шинэ өргөдлүүд
            </h2>
            <Link
              href="/admin/applications"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-cyan-strong hover:underline"
            >
              Бүгд
            </Link>
          </div>
          {latestApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Шинэ өргөдөл алга.</p>
          ) : (
            <ul className="divide-y text-sm">
              {latestApplications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/applications?q=${encodeURIComponent(a.fullName)}`}
                    className="font-semibold hover:underline"
                  >
                    {a.fullName}
                  </Link>
                  <span className="flex items-center gap-2">
                    {a.className && <Badge variant="secondary">{a.className}</Badge>}
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={new Date(a.createdAt).toISOString()}
                    >
                      {formatDate("mn", a.createdAt, "long")}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <StatsDashboard />
      </div>
    </>
  );
}
