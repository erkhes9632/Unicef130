import { and, count, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { Images, Plus } from "lucide-react";
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
import { albums, images } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, param, searchParam, wordPrefix } from "@/lib/admin/list-query";
import { yearFilterField, yearParam } from "@/lib/admin/year-filter";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { formatDate, fromIsoDate } from "@/lib/dates/format";
import { schoolYearDays } from "@/lib/school-year";
import { schoolYearDaySql } from "@/lib/school-year-sql";
import { deleteAlbum } from "./actions";

export const metadata: Metadata = { title: "Зургийн цомог" };

export default async function AdminGalleryPage({ searchParams }: PageProps<"/admin/gallery">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = searchParam(sp);
  const state = param(sp, "state", 10);
  const page = pageParam(sp);
  const year = yearParam(sp);
  const where: SQL[] = [];
  if (year) {
    // Range on the indexed "YYYY-MM-DD" date.
    const d = schoolYearDays(year);
    where.push(gte(albums.date, d.from), lt(albums.date, d.to));
  }
  if (q) where.push(wordPrefix([albums.title, albums.titleEn], q));
  if (state === "published") where.push(eq(albums.published, true));
  if (state === "draft") where.push(eq(albums.published, false));
  const condition = where.length ? and(...where) : undefined;
  const db = await getDb();
  const [[total], rows, years, current] = await Promise.all([
    db.select({ n: count() }).from(albums).where(condition),
    db
      .select({
        id: albums.id,
        title: albums.title,
        date: albums.date,
        published: albums.published,
        coverUrl: albums.coverUrl,
        n: count(images.id),
      })
      .from(albums)
      .leftJoin(images, eq(images.albumId, albums.id))
      .where(condition)
      .groupBy(albums.id)
      .orderBy(desc(albums.date), desc(albums.createdAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db.selectDistinct({ y: schoolYearDaySql(albums.date) }).from(albums),
    getCurrentSchoolYear(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Зургийн цомог"
        description="Сайтын «Зургийн цомог» хэсэг. Цомог үүсгээд зургаа оруулна; нийтлэгдсэн цомог сайтад харагдана."
        actions={
          <Button asChild>
            <Link href="/admin/gallery/new">
              <Plus /> Шинэ цомог
            </Link>
          </Button>
        }
      />
      <FilterBar
        search={{ label: "Хайх (нэр)", placeholder: "хандив" }}
        fields={[
          yearFilterField(
            years.map((r) => r.y),
            current,
          ),
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
        noun="цомог"
        emptyText="Ийм цомог олдсонгүй."
      >
        {rows.length === 0 ? (
          <AdminEmpty
            title="Цомог хараахан нэмэгдээгүй байна."
            hint="Цомог үүсгээд зургаа оруулна; нийтэлсний дараа «Зургийн цомог» хуудсанд гарна."
            action={{ href: "/admin/gallery/new", label: "Шинэ цомог" }}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                {/* Duplicate of the title link below: skipped by keyboard and screen readers. */}
                <Link
                  href={`/admin/gallery/${a.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="block aspect-[16/9] bg-muted"
                >
                  {a.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img
                      src={a.coverUrl}
                      alt=""
                      width={480}
                      height={360}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <Images className="size-8" />
                    </span>
                  )}
                </Link>
                <div className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/gallery/${a.id}`}
                      className="line-clamp-1 font-semibold hover:text-brand-cyan-strong pointer-coarse:py-2.5"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={a.published ? "default" : "secondary"}>
                        {a.published ? "Нийтлэгдсэн" : "Ноорог"}
                      </Badge>
                      {formatDate("mn", fromIsoDate(a.date), "long")} · {a.n} зураг
                    </p>
                  </div>
                  <ConfirmAction
                    action={deleteAlbum.bind(null, a.id)}
                    description={`«${a.title}» цомог болон бүх зургийг устгах уу?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pager path="/admin/gallery" params={sp} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
