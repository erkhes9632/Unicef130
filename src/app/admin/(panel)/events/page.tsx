import { and, count, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, param, searchParam, wordPrefix } from "@/lib/admin/list-query";
import { yearFilterField, yearParam } from "@/lib/admin/year-filter";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { nowMs } from "@/lib/dates/ub-time";
import { schoolYearRange } from "@/lib/school-year";
import { schoolYearSql } from "@/lib/school-year-sql";
import { deleteEvent } from "./actions";

export const metadata: Metadata = { title: "Арга хэмжээ" };

export default async function AdminEventsPage({ searchParams }: PageProps<"/admin/events">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = searchParam(sp);
  const when = param(sp, "when", 10);
  const state = param(sp, "state", 10);
  const page = pageParam(sp);
  const year = yearParam(sp);
  const now = nowMs();
  const where: SQL[] = [];
  if (year) {
    // Range on the indexed start date.
    const r = schoolYearRange(year);
    where.push(gte(events.startsAt, new Date(r.from)), lt(events.startsAt, new Date(r.to)));
  }
  if (q) where.push(wordPrefix([events.title, events.titleEn], q));
  if (when === "upcoming") where.push(gte(events.startsAt, new Date(now)));
  if (when === "past") where.push(lt(events.startsAt, new Date(now)));
  if (state === "published") where.push(eq(events.published, true));
  if (state === "draft") where.push(eq(events.published, false));
  const condition = where.length ? and(...where) : undefined;
  const db = await getDb();
  const [[total], rows, years, current] = await Promise.all([
    db.select({ n: count() }).from(events).where(condition),
    db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        location: events.location,
        published: events.published,
      })
      .from(events)
      .where(condition)
      .orderBy(desc(events.startsAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.selectDistinct({ y: schoolYearSql(events.startsAt) }).from(events),
    getCurrentSchoolYear(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Арга хэмжээ"
        description="Сайтын «Арга хэмжээ» хэсэг ба хуанли. Нийтлэгдсэн арга хэмжээнд гишүүд бүртгүүлж, ирцийг энд тэмдэглэнэ."
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus /> Шинэ арга хэмжээ
            </Link>
          </Button>
        }
      />
      <FilterBar
        search={{ label: "Хайх (нэр)", placeholder: "волейбол / мод тарих" }}
        fields={[
          yearFilterField(
            years.map((r) => r.y),
            current,
          ),
          {
            type: "select",
            name: "when",
            label: "Хугацаа",
            options: [
              { value: "", label: "Бүгд" },
              { value: "upcoming", label: "Удахгүй болох" },
              { value: "past", label: "Болж өнгөрсөн" },
            ],
          },
          {
            type: "select",
            name: "state",
            label: "Төлөв",
            options: [
              { value: "", label: "Бүгд" },
              { value: "published", label: "Нийтлэгдсэн" },
              { value: "draft", label: "Ноорог" },
            ],
          },
        ]}
        count={total?.n ?? 0}
        noun="арга хэмжээ"
        emptyText="Ийм арга хэмжээ олдсонгүй."
      >
        {rows.length === 0 ? (
          <AdminEmpty
            title="Арга хэмжээ хараахан нэмэгдээгүй байна."
            hint="Удахгүй болох арга хэмжээгээ нэмбэл сайтын хуанлид гарна."
            action={{ href: "/admin/events/new", label: "Шинэ арга хэмжээ" }}
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/events/${r.id}`}
                    className="line-clamp-1 font-semibold hover:text-brand-cyan-strong pointer-coarse:py-2.5"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={r.published ? "default" : "secondary"}>
                      {r.published ? "Нийтлэгдсэн" : "Ноорог"}
                    </Badge>
                    {r.startsAt.getTime() < now && <Badge variant="outline">Өнгөрсөн</Badge>}
                    <span>
                      {formatDate("mn", r.startsAt, "long")} {formatDate("mn", r.startsAt, "time")}
                    </span>
                    <span className="truncate">{r.location}</span>
                  </p>
                </div>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Засах">
                  <Link href={`/admin/events/${r.id}`}>
                    <Pencil />
                  </Link>
                </Button>
                <ConfirmAction
                  action={deleteEvent.bind(null, r.id)}
                  description={`«${r.title}» арга хэмжээг устгах уу?`}
                />
              </li>
            ))}
          </ul>
        )}
        <Pager path="/admin/events" params={sp} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
