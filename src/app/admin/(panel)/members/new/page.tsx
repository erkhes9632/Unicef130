import type { Metadata } from "next";
import { MemberForm } from "@/components/admin/member-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getDb } from "@/db";
import { param } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { listTeams } from "@/lib/members/teams";
import { teamYearOptions } from "@/lib/members/years";
import { displayYear } from "@/lib/school-year";
import { saveMember } from "../actions";

export const metadata: Metadata = { title: "Гишүүн нэмэх" };

/** Adds a person to the selected school year (?year=, default the current one). */
export default async function NewMemberPage({ searchParams }: PageProps<"/admin/members/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const current = await getCurrentSchoolYear();
  const years = await teamYearOptions(await getDb(), current);
  const requested = param(sp, "year", 9);
  const year = years.includes(requested) ? requested : current;
  const teams = await listTeams();
  return (
    <>
      <AdminPageHeader
        title={`Гишүүн нэмэх — ${displayYear(year)}`}
        description="Клубын удирдлага эсвэл гишүүнийг энэ хичээлийн жилд нэмнэ. Нэр анхнаасаа нийтэд харагдахгүй."
      />
      <MemberForm action={saveMember.bind(null, null)} year={year} teams={teams} />
    </>
  );
}
