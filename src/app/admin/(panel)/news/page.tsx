import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
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
  const where: SQL[] = [];
  if (status) where.push(eq(news.status, status));
  if (q) where.push(wordPrefix([news.title, news.titleEn], q));
  const condition = where.length ? and(...where) : undefined;
  const db = await getDb();
  const [[total], rows] = await Promise.all([
    db.select({ n: count() }).from(news).where(condition),
    db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        status: news.status,
        category: news.category,
        publishedAt: news.publishedAt,
        updatedAt: news.updatedAt,
      })
      .from(news)
      .where(condition)
      .orderBy(desc(news.updatedAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
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
        fields={[{ type: "select", name: "status", label: "Төлөв", options: statusOptions }]}
        count={total?.n ?? 0}
        noun="мэдээ"
        emptyText="Ийм мэдээ олдсонгүй."
      >
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
            Мэдээ хараахан нэмэгдээгүй байна.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/news/${r.id}`}
                    className="line-clamp-1 font-semibold hover:text-brand-cyan-strong"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={r.status === "published" ? "default" : "secondary"}>
                      {r.status === "published" ? "Нийтлэгдсэн" : "Ноорог"}
                    </Badge>
                    <span>{categoryLabel[r.category] ?? r.category}</span>
                    {r.publishedAt && <span>{formatDate("mn", r.publishedAt, "long")}</span>}
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
