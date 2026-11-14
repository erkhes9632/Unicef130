import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { NewsForm } from "@/components/admin/news-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { toUbInputValue } from "@/lib/dates/ub-input";
import { saveNews } from "../actions";

export const metadata: Metadata = { title: "Мэдээ засах" };

export default async function EditNewsPage({
  params,
  searchParams,
}: PageProps<"/admin/news/[id]">) {
  await requireUser();
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
          row.status === "published" && (
            <Button asChild variant="outline">
              <Link href={`/news/${row.slug}`} target="_blank">
                <ExternalLink /> Сайт дээр харах
              </Link>
            </Button>
          )
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
        }}
      />
    </>
  );
}
