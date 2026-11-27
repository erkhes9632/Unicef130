/* eslint-disable @next/next/no-img-element -- admin preview of an uploaded cover */
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichText } from "@/components/common/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { news } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";

export const metadata: Metadata = { title: "Урьдчилан харах" };

/** Published but dated in the future: the site shows it from that moment. */
const isScheduled = (publishedAt: Date | null, now: number = Date.now()) =>
  publishedAt !== null && publishedAt.getTime() > now;

/** How a post (also a draft or a scheduled one) will read on the site. Admin only. */
export default async function NewsPreviewPage({ params }: PageProps<"/admin/news/[id]/preview">) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await (await getDb()).select().from(news).where(eq(news.id, id)).limit(1);
  if (!row) notFound();
  const scheduled = isScheduled(row.publishedAt);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/news/${id}`}>
            <ArrowLeft /> Засах руу буцах
          </Link>
        </Button>
        <Badge variant={row.status === "published" && !scheduled ? "default" : "secondary"}>
          {row.status === "draft" ? "Ноорог" : scheduled ? "Товлосон" : "Нийтлэгдсэн"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Урьдчилан харах — сайт дээр ингэж харагдана
        </span>
      </div>
      <article className="space-y-6 rounded-3xl bg-background p-6 ring-1 ring-border sm:p-10">
        <p className="text-sm text-muted-foreground">
          {formatDate("mn", row.publishedAt ?? row.updatedAt, "long")}
        </p>
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">{row.title}</h1>
        {row.excerpt && <p className="text-lg text-muted-foreground">{row.excerpt}</p>}
        {row.coverUrl && (
          <img
            src={row.coverUrl}
            alt=""
            width={1600}
            height={900}
            className="aspect-video w-full rounded-2xl object-cover"
          />
        )}
        <RichText doc={row.content} />
      </article>
    </div>
  );
}
