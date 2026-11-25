import { and, count, desc, eq, gte, inArray, isNotNull, lt, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { getDb } from "@/db";
import { activityLog, members, users } from "@/db/schema";
import { FIELD_LABELS, groupEntries, type AuditNames } from "@/lib/admin/audit-text";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, param } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";

export const metadata: Metadata = { title: "Үйлдлийн түүх" };

const entityLabels: Record<string, string> = {
  news: "Мэдээ",
  event: "Арга хэмжээ",
  album: "Зургийн цомог",
  member: "Гишүүн",
  application: "Өргөдөл",
  recruitment: "Элсэлт",
  settings: "Тохиргоо",
  impact: "Жилийн үр дүн",
  user: "Хэрэглэгч",
  faq: "Түгээмэл асуулт",
  hours: "Сайн дурын цаг",
};

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
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
const time = (d: Date) => formatDate("mn", d, "time");

/**
 * Every change made in the admin, in plain words, newest first; runs of the same action are
 * grouped ("×5, 16:11–16:16"). Names appear for members and for accounts with a role; applicants
 * stay numbers.
 */
export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = {
    user: param(sp, "user", 64),
    type: param(sp, "type", 20),
    from: param(sp, "from", 10),
    to: param(sp, "to", 10),
  };
  const page = pageParam(sp);

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
  const [[total], rows, actors] = await Promise.all([
    db.select({ n: count() }).from(activityLog).where(condition),
    db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        summary: activityLog.summary,
        details: activityLog.details,
        createdAt: activityLog.createdAt,
        userId: activityLog.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(condition)
      .orderBy(desc(activityLog.createdAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    // People who appear in the log (admins), for the "who" filter.
    db
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(activityLog, eq(activityLog.userId, users.id)),
  ]);

  // Names for the records mentioned on this page only.
  const userIds = [
    ...new Set(rows.filter((r) => r.entityType === "user" && r.entityId).map((r) => r.entityId!)),
  ];
  const memberIds = [
    ...new Set(rows.filter((r) => r.entityType === "member" && r.entityId).map((r) => r.entityId!)),
  ];
  const [accountRows, memberRows] = await Promise.all([
    userIds.length
      ? db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users)
          .where(and(inArray(users.id, userIds), isNotNull(users.role)))
      : [],
    memberIds.length
      ? db
          .select({ id: members.id, name: members.name })
          .from(members)
          .where(and(inArray(members.id, memberIds), eq(members.anonymized, false)))
      : [],
  ]);
  const names: AuditNames = {
    accounts: new Map(accountRows.map((a) => [a.id, { name: a.name, role: a.role }])),
    members: new Map(memberRows.map((m) => [m.id, m.name])),
  };
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = groupEntries(rows, names);

  return (
    <>
      <AdminPageHeader
        title="Үйлдлийн түүх"
        description="Админ хэсэгт хэн, юуг, хэзээ өөрчилсөн бэ. Өргөдөл гаргагчийн нэр энд бичигдэхгүй (зөвхөн дугаар)."
      />
      <FilterBar
        fields={[
          {
            type: "select",
            name: "user",
            label: "Хэн",
            options: [
              { value: "", label: "Бүгд" },
              ...actors.map((u) => ({ value: u.id, label: u.name || u.email })),
            ],
          },
          {
            type: "select",
            name: "type",
            label: "Юу",
            options: [
              { value: "", label: "Бүгд" },
              ...Object.entries(entityLabels).map(([value, label]) => ({ value, label })),
            ],
          },
          { type: "date", name: "from", label: "Эхлэх огноо" },
          { type: "date", name: "to", label: "Дуусах огноо" },
        ]}
        count={total?.n ?? 0}
        noun="бичлэг"
        emptyText="Энэ шүүлтүүрт тохирох үйлдэл алга."
      >
        {groups.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Одоогоор үйлдэл бүртгэгдээгүй байна.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card text-sm ring-1 ring-border">
            {groups.map(({ entry, text, count: n, first, last }) => {
              const r = byId.get(entry.id)!;
              return (
                <li
                  key={entry.id}
                  className="grid gap-1 p-3 sm:grid-cols-[11rem_1fr] sm:gap-4 sm:p-4"
                >
                  <div className="text-xs text-muted-foreground">
                    <time dateTime={last.toISOString()}>
                      {formatDate("mn", last, "long")} {time(last)}
                    </time>
                    <p className="font-semibold text-foreground">
                      {r.userName || r.userEmail || "Систем"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p>
                      <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        {entityLabels[r.entityType] ?? "Бусад"}
                      </span>
                      {text}
                      {n > 1 && (
                        <span className="ml-1 text-muted-foreground">
                          (×{n}, {time(first)}–{time(last)})
                        </span>
                      )}
                    </p>
                    {n === 1 && r.details && (
                      <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                        {Object.entries(r.details).map(([field, [before, after]]) => (
                          <div key={field} className="flex flex-wrap gap-x-2">
                            <dt className="font-semibold">{FIELD_LABELS[field] ?? field}:</dt>
                            <dd className="break-all">
                              {show(before)} →{" "}
                              <span className="text-foreground">{show(after)}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pager path="/admin/audit" params={sp} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
