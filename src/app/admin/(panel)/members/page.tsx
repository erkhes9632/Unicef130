import { asc } from "drizzle-orm";
import { Camera, EyeOff, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { memberGroupLabel } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { deleteMember } from "./actions";

export const metadata: Metadata = { title: "Гишүүд" };

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  await requireUser();
  const sp = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(members)
    .orderBy(asc(members.group), asc(members.sortOrder), asc(members.name));

  return (
    <>
      <AdminPageHeader
        title="Гишүүд"
        description="Клубын удирдлага ба гишүүд. Эрэмбийн тоогоор дэс дараалал тогтоно."
        actions={
          <Button asChild>
            <Link href="/admin/members/new">
              <Plus /> Гишүүн нэмэх
            </Link>
          </Button>
        }
      />
      {sp.saved === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
          Хадгалагдлаа.
        </p>
      )}
      <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3 sm:p-4">
            <span className="w-10 text-center font-mono text-xs text-muted-foreground">
              {m.sortOrder}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/members/${m.id}`}
                className="font-semibold hover:text-brand-cyan-strong"
              >
                {m.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={m.group === "leadership" ? "default" : "secondary"}>
                  {memberGroupLabel[m.group]}
                </Badge>
                <span>{m.role}</span>
                <span>· {m.className}</span>
                {m.photoUrl && (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="size-3" /> {m.showPhoto ? "Зураг нийтэд" : "Зураг нууц"}
                  </span>
                )}
                {!m.active && (
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="size-3" /> Идэвхгүй
                  </span>
                )}
              </p>
            </div>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Засах">
              <Link href={`/admin/members/${m.id}`}>
                <Pencil />
              </Link>
            </Button>
            <ConfirmAction
              action={deleteMember.bind(null, m.id)}
              description={`${m.name}-г жагсаалтаас устгах уу?`}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
