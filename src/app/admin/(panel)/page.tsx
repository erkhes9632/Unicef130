import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { CalendarDays, Inbox, Mail, Newspaper } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import {
  activityLog,
  applications,
  applicationStatuses,
  contactMessages,
  events,
  news,
  recruitmentPeriods,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { UB_OFFSET_MS } from "@/lib/dates/ub-time";
import { applicationStatusLabels, findOpenPeriod } from "@/lib/recruitment/logic";

/** Counts for the open (or latest) recruitment period. */
async function recruitmentWidgets() {
  const db = await getDb();
  const periods = await db
    .select({
      id: recruitmentPeriods.id,
      name: recruitmentPeriods.name,
      opensAt: recruitmentPeriods.opensAt,
      closesAt: recruitmentPeriods.closesAt,
    })
    .from(recruitmentPeriods)
    .orderBy(desc(recruitmentPeriods.opensAt));
  const period = findOpenPeriod(periods) ?? periods.find((p) => p.opensAt.getTime() <= Date.now());
  if (!period) return null;
  // "Today" in Ulaanbaatar (UTC+8).
  const ubMidnight = new Date(
    Math.floor((Date.now() + UB_OFFSET_MS) / 86_400_000) * 86_400_000 - UB_OFFSET_MS,
  );
  const inPeriod = eq(applications.periodId, period.id);
  const [byStatus, byClass, [today]] = await Promise.all([
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .where(inPeriod)
      .groupBy(applications.status),
    db
      .select({ className: applications.className, n: count() })
      .from(applications)
      .where(inPeriod)
      .groupBy(applications.className),
    db
      .select({ n: count() })
      .from(applications)
      .where(and(inPeriod, gte(applications.createdAt, ubMidnight))),
  ]);
  const sorted = byClass.sort((a, b) =>
    a.className.localeCompare(b.className, "mn", { numeric: true }),
  );
  return {
    periodName: period.name,
    today: today?.n ?? 0,
    byStatus: applicationStatuses.map((status) => ({
      status,
      label: applicationStatusLabels[status],
      n: byStatus.find((s) => s.status === status)?.n ?? 0,
    })),
    byClass: sorted,
    maxClass: Math.max(1, ...sorted.map((c) => c.n)),
  };
}

export default async function AdminDashboard() {
  const me = await requireAdmin();
  const db = await getDb();

  const [[newsCount], [eventsCount], [newApps], [unread], recent, latestApps] = await Promise.all([
    db.select({ n: count() }).from(news),
    db.select({ n: count() }).from(events),
    db.select({ n: count() }).from(applications).where(eq(applications.status, "new")),
    db.select({ n: count() }).from(contactMessages).where(isNull(contactMessages.readAt)),
    db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        summary: activityLog.summary,
        createdAt: activityLog.createdAt,
        userName: users.name,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(10),
    db
      .select({
        id: applications.id,
        fullName: applications.fullName,
        className: applications.className,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(eq(applications.status, "new"))
      .orderBy(desc(applications.createdAt))
      .limit(5),
  ]);

  // Recruitment widgets for the period that is open now (or the most recent one).
  const widgets = await recruitmentWidgets();

  const cards = [
    {
      label: "Мэдээ",
      value: newsCount?.n ?? 0,
      href: "/admin/news",
      icon: Newspaper,
      tone: "bg-brand-cyan-soft text-brand-cyan-strong",
    },
    {
      label: "Арга хэмжээ",
      value: eventsCount?.n ?? 0,
      href: "/admin/events",
      icon: CalendarDays,
      tone: "bg-brand-purple-soft text-brand-purple-strong",
    },
    {
      label: "Шинэ өргөдөл",
      value: newApps?.n ?? 0,
      href: "/admin/applications?status=new",
      icon: Inbox,
      tone: "bg-brand-green-soft text-brand-green-strong",
    },
    {
      label: "Уншаагүй зурвас",
      value: unread?.n ?? 0,
      href: "/admin/messages",
      icon: Mail,
      tone: "bg-brand-gold-soft text-brand-gold-strong",
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={me.name ? `Сайн байна уу, ${me.name}!` : "Сайн байна уу!"}
        description="Клубын сайтын товч мэдээлэл"
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, href, icon: Icon, tone }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border hover:shadow-md"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-heading text-2xl font-extrabold">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {widgets && (
        <section className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-border" aria-labelledby="rw">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="rw" className="font-bold">
              Элсэлт: {widgets.periodName}
            </h2>
            <span className="rounded-full bg-brand-green-soft px-3 py-1 text-sm font-semibold">
              Өнөөдөр ирсэн: {widgets.today}
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {widgets.byStatus.map((s) => (
                <div key={s.status} className="rounded-xl bg-muted/50 p-3">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="font-heading text-2xl font-extrabold">{s.n}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Ангиар</h3>
              {widgets.byClass.length === 0 ? (
                <p className="text-sm text-muted-foreground">Өргөдөл хараахан алга.</p>
              ) : (
                <dl className="space-y-1.5">
                  {widgets.byClass.map((c) => (
                    <div
                      key={c.className}
                      className="grid grid-cols-[3rem_1fr_2rem] items-center gap-2 text-sm"
                    >
                      <dt className="font-semibold">{c.className}</dt>
                      <dd
                        aria-hidden="true"
                        className="h-2.5 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-brand-cyan"
                          style={{ width: `${(c.n / widgets.maxClass) * 100}%` }}
                        />
                      </dd>
                      <dd className="text-right tabular-nums">{c.n}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Сүүлийн үйлдлүүд</h2>
            <Link
              href="/admin/audit"
              className="text-sm font-semibold text-brand-cyan-strong hover:underline"
            >
              Бүгд
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Одоогоор үйлдэл бүртгэгдээгүй байна.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-semibold">{r.userName ?? "Систем"}</span> —{" "}
                    {r.summary || r.action}
                  </span>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={r.createdAt.toISOString()}
                  >
                    {formatDate("mn", r.createdAt, "long")} {formatDate("mn", r.createdAt, "time")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Шинэ өргөдлүүд</h2>
            <Link
              href="/admin/applications"
              className="text-sm font-semibold text-brand-cyan-strong hover:underline"
            >
              Бүгд
            </Link>
          </div>
          {latestApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Шинэ өргөдөл алга.</p>
          ) : (
            <ul className="divide-y text-sm">
              {latestApps.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-semibold">{a.fullName}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{a.className}</Badge>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={a.createdAt.toISOString()}
                    >
                      {formatDate("mn", a.createdAt, "long")}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
