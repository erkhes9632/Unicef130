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
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { formatDate, formatNumber } from "@/lib/dates/format";
import { nowMs } from "@/lib/dates/ub-time";
import { latestTeamYear, wizardYears, yearTotalsForDashboard } from "@/lib/members/years";
import { givenName } from "@/lib/names";
import { displayYear } from "@/lib/school-year";
import { dashboardTodos } from "@/lib/stats/dashboard";
import { siteStatus } from "@/lib/stats/status";

/** The given name for the greeting ("Сайн байна уу, Анужин!"), never the full name. */
function greetingName(me: { firstName: string; name: string }) {
  return me.firstName.trim() || givenName(me.name);
}

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
  const db = await getDb();
  const current = await getCurrentSchoolYear();
  const [status, { todos, latestApplications }, year, latest] = await Promise.all([
    siteStatus(env.DB, now),
    dashboardTodos(env.DB, now),
    yearTotalsForDashboard(db, current),
    latestTeamYear(db),
  ]);
  const { from, to } = wizardYears(latest, current);
  const yearLabel = displayYear(current);
  const yearTiles = [
    { label: "Удирдлага", value: year.leaders, href: "/admin/members" },
    { label: "Гишүүн", value: year.members, href: "/admin/members" },
    { label: "Сайн дурын цаг", value: year.hours, href: "/admin/hours" },
  ];

  return (
    <>
      <AdminPageHeader
        title={greetingName(me) ? `Сайн байна уу, ${greetingName(me)}!` : "Сайн байна уу!"}
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

        {from !== null && to === current && year.leaders + year.members === 0 ? (
          <section
            aria-labelledby="new-year-title"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-cyan-soft p-5 ring-1 ring-border"
          >
            <div>
              <h2 id="new-year-title" className="flex items-center gap-2 font-bold">
                <CalendarPlus className="size-5" aria-hidden="true" /> Шинэ хичээлийн жил эхлүүлэх
              </h2>
              <p className="mt-1 text-sm">
                Одоогийн жил: {displayYear(from)} → Шинэ жил: {displayYear(to)}. {yearLabel} оны баг
                хараахан үүсээгүй — сайт {displayYear(from)} оны багийг харуулж байна.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/school-year">Эхлүүлэх →</Link>
            </Button>
          </section>
        ) : null}

        <section
          aria-labelledby="year-title"
          className="rounded-2xl bg-card p-5 ring-1 ring-border"
        >
          <h2 id="year-title" className="mb-3 font-bold">
            {yearLabel} хичээлийн жил{" "}
            <span className="font-normal text-muted-foreground">(одоогийн)</span>
          </h2>
          <ul className="grid grid-cols-3 gap-3">
            {yearTiles.map((tile) => (
              <li key={tile.label}>
                <Link href={tile.href} className="block rounded-xl bg-muted/60 p-3 hover:bg-muted">
                  <span className="block font-heading text-2xl font-extrabold">
                    {formatNumber(tile.value)}
                  </span>
                  <span className="text-sm">{tile.label}</span>
                  <span className="block text-xs text-muted-foreground">{yearLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

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
