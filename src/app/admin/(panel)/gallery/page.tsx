import { count, desc, eq } from "drizzle-orm";
import { Images, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { albums, images } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate, fromIsoDate } from "@/lib/dates/format";
import { deleteAlbum } from "./actions";

export const metadata: Metadata = { title: "Зургийн цомог" };

export default async function AdminGalleryPage() {
  await requireUser();
  const db = await getDb();
  const rows = await db
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
    .groupBy(albums.id)
    .orderBy(desc(albums.date));

  return (
    <>
      <AdminPageHeader
        title="Зургийн цомог"
        actions={
          <Button asChild>
            <Link href="/admin/gallery/new">
              <Plus /> Шинэ цомог
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          Цомог алга.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <Link href={`/admin/gallery/${a.id}`} className="block aspect-[16/9] bg-muted">
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img src={a.coverUrl} alt="" className="size-full object-cover" />
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
                    className="line-clamp-1 font-semibold hover:text-brand-cyan-strong"
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
    </>
  );
}
