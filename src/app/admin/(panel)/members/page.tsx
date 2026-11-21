import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MembersBulkList } from "@/components/admin/members-bulk-list";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { deleteMember, setMembersPublic } from "./actions";

export const metadata: Metadata = { title: "Гишүүд" };

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const all = await db
    .select()
    .from(members)
    .orderBy(asc(members.group), asc(members.sortOrder), asc(members.name));
  // Anonymized rows (deleted accounts) only count towards the hours total.
  const totalHours = all.reduce((sum, r) => sum + (r.volunteerHours ?? 0), 0);
  const teams = [...new Set(all.map((r) => r.team).filter(Boolean))].sort();
  const team = typeof sp.team === "string" ? sp.team : "";
  const rows = all.filter((r) => !r.anonymized && (!team || r.team === team));

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
      {teams.length > 0 && (
        <nav aria-label="Баг" className="mb-4 flex flex-wrap gap-2 text-sm">
          {["", ...teams].map((t) => (
            <Link
              key={t || "all"}
              href={t ? `/admin/members?team=${encodeURIComponent(t)}` : "/admin/members"}
              aria-current={team === t ? "page" : undefined}
              className={`rounded-full px-3 py-1 ring-1 ring-border hover:bg-muted ${team === t ? "bg-brand-cyan text-brand-ink ring-brand-cyan" : ""}`}
            >
              {t || "Бүх баг"}
            </Link>
          ))}
        </nav>
      )}
      <MembersBulkList
        rows={rows}
        isAdmin={user.role === "admin"}
        setPublic={setMembersPublic}
        deleteMember={deleteMember}
      />
    </>
  );
}
