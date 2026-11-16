import type { Metadata } from "next";
import { MemberForm } from "@/components/admin/member-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { listTeams } from "@/lib/members/teams";
import { saveMember } from "../actions";

export const metadata: Metadata = { title: "Гишүүн нэмэх" };

export default async function NewMemberPage() {
  await requireAdmin();
  const teams = await listTeams();
  return (
    <>
      <AdminPageHeader title="Гишүүн нэмэх" />
      <MemberForm action={saveMember.bind(null, null)} teams={teams} />
    </>
  );
}
