import { and, count, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { NativeSelect } from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { activityLog, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";

export const metadata: Metadata = { title: "Үйлдлийн түүх" };

const PAGE_SIZE = 50;

const entityLabels: Record<string, string> = {
  news: "Мэдээ",
  event: "Арга хэмжээ",
  album: "Зургийн цомог",
  member: "Гишүүн",
  application: "Өргөдөл",
  recruitment: "Элсэлт",
  message: "Зурвас",
  settings: "Тохиргоо",
  impact: "Жилийн үр дүн",
  user: "Хэрэглэгч",
};

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const show = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "boolean"
      ? v
        ? "тийм"
        : "үгүй"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters = { user: str("user"), type: str("type"), from: str("from"), to: str("to") };
  const page = Math.max(1, Number.parseInt(str("page") || "1", 10) || 1);

  const where: SQL[] = [];
  if (filters.user) where.push(eq(activityLog.userId, filters.user));
  if (filters.type in entityLabels) where.push(eq(activityLog.entityType, filters.type));
  // Dates are interpreted in Ulaanbaatar time (UTC+8).
  if (isDate(filters.from))
    where.push(gte(activityLog.createdAt, new Date(`${filters.from}T00:00:00+08:00`)));
  if (isDate(filters.to))
    where.push(
      lt(activityLog.createdAt, new Date(Date.parse(`${filters.to}T00:00:00+08:00`) + 86_400_000)),
    );
  const condition = where.length ? and(...where) : undefined;

  const db = await getDb();
  const [[total], rows, users] = await Promise.all([
    db.select({ n: count() }).from(activityLog).where(condition),
    db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityType: activityLog.entityType,
        summary: activityLog.summary,
        details: activityLog.details,
        createdAt: activityLog.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(activityLog)
      .leftJoin(user, eq(activityLog.userId, user.id))
      .where(condition)
      .orderBy(desc(activityLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ id: user.id, name: user.name, email: user.email }).from(user),
  ]);
  const pageCount = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) => {
    const q = new URLSearchParams(
      Object.entries({ ...filters, page: p > 1 ? String(p) : "" }).filter(([, v]) => v),
    );
    return `/admin/audit${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <AdminPageHeader
        title="Үйлдлийн түүх"
        description="Админ хэсэгт хийгдсэн өөрчлөлт бүр: хэн, юуг, хэзээ. Өргөдөл гаргагчийн нэр энд бичигдэхгүй (зөвхөн дугаар)."
      />
      <form className="mb-6 grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-xs font-semibold">
          <span>Хэрэглэгч</span>
          <NativeSelect name="user" defaultValue={filters.user}>
            <option value="">Бүгд</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Төрөл</span>
          <NativeSelect name="type" defaultValue={filters.type}>
            <option value="">Бүгд</option>
            {Object.entries(entityLabels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Эхлэх огноо</span>
          <Input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Дуусах огноо</span>
          <Input type="date" name="to" defaultValue={filters.to} />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Шүүх</Button>
          <Button asChild variant="ghost">
            <Link href="/admin/audit">Цэвэрлэх</Link>
          </Button>
        </div>
      </form>

      <p className="mb-2 text-sm text-muted-foreground">Нийт {total?.n ?? 0} бичлэг</p>
      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Энэ шүүлтүүрт тохирох үйлдэл алга.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card text-sm ring-1 ring-border">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-1 p-3 sm:grid-cols-[11rem_1fr] sm:gap-4 sm:p-4">
              <div className="text-xs text-muted-foreground">
                <time dateTime={r.createdAt.toISOString()}>
                  {formatDate("mn", r.createdAt, "long")} {formatDate("mn", r.createdAt, "time")}
                </time>
                <p className="font-semibold text-foreground">{r.userName ?? "Систем / терминал"}</p>
              </div>
              <div className="min-w-0">
                <p>
                  <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {entityLabels[r.entityType] ?? r.entityType}
                  </span>
                  {r.summary || r.action}
                </p>
                {r.details && (
                  <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {Object.entries(r.details).map(([field, [before, after]]) => (
                      <div key={field} className="flex flex-wrap gap-x-2">
                        <dt className="font-mono font-semibold">{field}:</dt>
                        <dd className="break-all">
                          {show(before)} → <span className="text-foreground">{show(after)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav aria-label="Хуудаслалт" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>← Шинэ рүү</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Хуучин рүү →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
