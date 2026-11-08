import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberForm } from "@/components/admin/member-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { saveMember } from "../actions";

export const metadata: Metadata = { title: "Гишүүн засах" };

export default async function EditMemberPage({ params }: PageProps<"/admin/members/[id]">) {
  await requireUser();
  const { id } = await params;
  const db = await getDb();
  const [m] = await db.select().from(members).where(eq(members.id, id)).limit(1);
  if (!m) notFound();
  return (
    <>
      <AdminPageHeader title="Гишүүн засах" description={m.name} />
      <MemberForm action={saveMember.bind(null, m.id)} initial={m} />
    </>
  );
}
