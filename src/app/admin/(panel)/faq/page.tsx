import { asc } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqForm } from "@/components/admin/faq-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { faqs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { deleteFaq, moveFaq, saveFaq } from "./actions";

export const metadata: Metadata = { title: "Түгээмэл асуулт" };

export default async function AdminFaqPage() {
  await requireAdmin();
  const rows = await (
    await getDb()
  )
    .select()
    .from(faqs)
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return (
    <>
      <AdminPageHeader
        title="Түгээмэл асуулт"
        description="/faq хуудасны асуулт, хариултууд. Англи хувилбар хоосон бол монголоор харагдана."
        actions={
          <Button asChild variant="outline">
            <Link href="/faq" target="_blank">
              <ExternalLink /> Сайт дээр харах
            </Link>
          </Button>
        }
      />
      <div className="space-y-4">
        {rows.map((f) => (
          <FaqForm
            key={`${f.id}-${f.updatedAt.getTime()}`}
            initial={f}
            save={saveFaq.bind(null, f.id)}
            remove={deleteFaq.bind(null, f.id)}
            move={moveFaq.bind(null, f.id)}
          />
        ))}
        <h2 className="pt-4 font-bold">Шинэ асуулт</h2>
        <FaqForm key={`new-${rows.length}`} save={saveFaq.bind(null, null)} />
      </div>
    </>
  );
}
