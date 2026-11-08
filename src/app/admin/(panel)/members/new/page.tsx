import type { Metadata } from "next";
import { MemberForm } from "@/components/admin/member-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth/session";
import { saveMember } from "../actions";

export const metadata: Metadata = { title: "Гишүүн нэмэх" };

export default async function NewMemberPage() {
  await requireUser();
  return (
    <>
      <AdminPageHeader title="Гишүүн нэмэх" />
      <MemberForm action={saveMember.bind(null, null)} />
    </>
  );
}
