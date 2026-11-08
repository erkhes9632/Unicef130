import { desc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { categoryLabel } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import { deleteNews } from "./actions";

export const metadata: Metadata = { title: "Мэдээ" };

const filters = [
  { value: "", label: "Бүгд" },
  { value: "published", label: "Нийтлэгдсэн" },
  { value: "draft", label: "Ноорог" },
] as const;

export default async function AdminNewsPage({ searchParams }: PageProps<"/admin/news">) {
  await requireUser();
  const sp = await searchParams;
  const status = sp.status === "draft" || sp.status === "published" ? sp.status : undefined;
  const db = await getDb();
  const rows = await db
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
    .where(status ? eq(news.status, status) : undefined)
    .orderBy(desc(news.updatedAt))
    .limit(200);

  return (
    <>
      <AdminPageHeader
        title="Мэдээ"
        description="Мэдээ, үйл ажиллагааны нийтлэлүүд"
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <Plus /> Шинэ мэдээ
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/news?status=${f.value}` : "/admin/news"}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              (status ?? "") === f.value && "bg-brand-cyan text-brand-night ring-brand-cyan",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          Мэдээ алга.
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
                description={`«${r.title}» мэдээг бүрмөсөн устгах уу?`}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
