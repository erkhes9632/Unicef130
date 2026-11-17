import { eq } from "drizzle-orm";
import { Eye, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/news-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listAlbumOptions } from "@/lib/data/gallery";
import { toUbInputValue } from "@/lib/dates/ub-input";
import { saveNews } from "../actions";

export const metadata: Metadata = { title: "Мэдээ засах" };

export default async function EditNewsPage({
  params,
  searchParams,
}: PageProps<"/admin/news/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const [row] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  if (!row) notFound();

  return (
    <>
      <AdminPageHeader
        title="Мэдээ засах"
        description={row.title}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/news/${row.id}/preview`}>
                <Eye /> Урьдчилан харах
              </Link>
            </Button>
            {row.status === "published" && (
              <Button asChild variant="outline">
                <Link href={`/news/${row.slug}`} target="_blank">
                  <ExternalLink /> Сайт дээр харах
                </Link>
              </Button>
            )}
          </>
        }
      />
      <NewsForm
        key={row.updatedAt.getTime()}
        action={saveNews.bind(null, row.id)}
        saved={sp.saved === "1"}
        initial={{
          title: row.title,
          titleEn: row.titleEn,
          slug: row.slug,
          excerpt: row.excerpt,
          excerptEn: row.excerptEn,
          category: row.category,
          tags: row.tags,
          coverUrl: row.coverUrl,
          content: row.content,
          contentEn: row.contentEn,
          status: row.status,
          publishedAt: toUbInputValue(row.publishedAt),
          sdgs: row.sdgs,
          featured: row.featured,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          albumId: row.albumId,
        }}
        albums={await listAlbumOptions()}
      />
    </>
  );
}
