import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
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
import { news } from "@/db/schema";
import { categoryLabel } from "@/lib/admin/labels";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, searchParam, wordPrefix } from "@/lib/admin/list-query";
import { yearFilterField, yearParam } from "@/lib/admin/year-filter";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { displayYear, schoolYearOf, schoolYearRange } from "@/lib/school-year";
import { schoolYearSql } from "@/lib/school-year-sql";
import { deleteNews } from "./actions";

export const metadata: Metadata = { title: "Мэдээ" };

const statusOptions = [
  { value: "", label: "Бүгд" },
  { value: "published", label: "Нийтлэгдсэн" },
  { value: "draft", label: "Ноорог" },
];

export default async function AdminNewsPage({ searchParams }: PageProps<"/admin/news">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "draft" || sp.status === "published" ? sp.status : undefined;
  const q = searchParam(sp);
  const page = pageParam(sp);
  const year = yearParam(sp);
  // Drafts have no publication date yet: they count by their creation date.
  const date = sql`coalesce(${news.publishedAt}, ${news.createdAt})`;
  const where: SQL[] = [];
  if (status) where.push(eq(news.status, status));
  if (year) {
    const r = schoolYearRange(year);
    where.push(gte(date, r.from), lt(date, r.to));
  }
  if (q) where.push(wordPrefix([news.title, news.titleEn], q));
  const condition = where.length ? and(...where) : undefined;
  const db = await getDb();
  const [[total], rows, years, current] = await Promise.all([
    db.select({ n: count() }).from(news).where(condition),
    db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        status: news.status,
        category: news.category,
        publishedAt: news.publishedAt,
        createdAt: news.createdAt,
      })
      .from(news)
      .where(condition)
      // Newest first by date (publication date, drafts by creation).
      .orderBy(desc(date), desc(news.createdAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.selectDistinct({ y: schoolYearSql(date) }).from(news),
    getCurrentSchoolYear(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Мэдээ"
        description="Сайтын «Мэдээ» хэсэгт гарах нийтлэлүүд. «Ноорог» нь зөвхөн танд харагдана, «Нийтлэх» дарсны дараа сайтад гарна."
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <Plus /> Шинэ мэдээ
            </Link>
          </Button>
        }
      />
      <FilterBar
        search={{ label: "Хайх (гарчиг)", placeholder: "хандив / мод тарих" }}
        fields={[
          yearFilterField(
            years.map((r) => r.y),
            current,
          ),
          { type: "select", name: "status", label: "Төлөв", options: statusOptions },
        ]}
        count={total?.n ?? 0}
        noun="мэдээ"
        emptyText="Ийм мэдээ олдсонгүй."
      >
        {rows.length === 0 ? (
          <AdminEmpty
            title="Мэдээ хараахан нэмэгдээгүй байна."
            hint="Эхний мэдээгээ бичээд «Нийтлэх» дарна."
            action={{ href: "/admin/news/new", label: "Шинэ мэдээ" }}
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/news/${r.id}`}
                    className="line-clamp-1 font-semibold hover:text-brand-cyan-strong pointer-coarse:py-2.5"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={r.status === "published" ? "default" : "secondary"}>
                      {r.status === "published" ? "Нийтлэгдсэн" : "Ноорог"}
                    </Badge>
                    <span>{categoryLabel[r.category] ?? r.category}</span>
                    {r.publishedAt && <span>{formatDate("mn", r.publishedAt, "long")}</span>}
                    <span>· {displayYear(schoolYearOf(r.publishedAt ?? r.createdAt))}</span>
                  </p>
                </div>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Засах">
                  <Link href={`/admin/news/${r.id}`}>
                    <Pencil />
                  </Link>
                </Button>
                <ConfirmAction
                  action={deleteNews.bind(null, r.id)}
                  description={`«${r.title}» мэдээг бүрмөсөн устгах уу? Сайтаас шууд алга болж, буцааж сэргээх боломжгүй.`}
                />
              </li>
            ))}
          </ul>
        )}
        <Pager path="/admin/news" params={sp} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
