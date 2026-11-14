import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MembersBulkList } from "@/components/admin/members-bulk-list";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { deleteMember, setMembersPublic } from "./actions";

export const metadata: Metadata = { title: "Гишүүд" };

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const user = await requireUser();
  const sp = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(members)
    .orderBy(asc(members.group), asc(members.sortOrder), asc(members.name));
  const totalHours = rows.reduce((sum, r) => sum + (r.volunteerHours ?? 0), 0);

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
      <p className="mb-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Нийт {rows.length} гишүүн · нийтэд харагдах {rows.filter((r) => r.showPublicly).length} ·
        бүртгэгдсэн сайн дурын цаг {totalHours} (хувь хүний цаг сайт дээр хэзээ ч харагдахгүй).
      </p>
      <MembersBulkList
        rows={rows}
        isAdmin={user.role === "admin"}
        setPublic={setMembersPublic}
        deleteMember={deleteMember}
      />
    </>
  );
}
