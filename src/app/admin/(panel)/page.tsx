import { count, desc, eq, isNull } from "drizzle-orm";
import { CalendarDays, Inbox, Mail, Newspaper } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { activityLog, applications, contactMessages, events, news, user } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const me = await requireUser();
  const sp = await searchParams;
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
        userName: user.name,
      })
      .from(activityLog)
      .leftJoin(user, eq(activityLog.userId, user.id))
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
        title={`Сайн байна уу, ${me.name}!`}
        description="Клубын сайтын товч мэдээлэл"
      />
      {sp.forbidden && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          Энэ хэсэгт зөвхөн админ хандах эрхтэй.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, href, icon: Icon, tone }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border transition-shadow hover:shadow-md"
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-4 font-bold">Сүүлийн үйлдлүүд</h2>
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
