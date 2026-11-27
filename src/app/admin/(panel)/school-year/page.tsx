import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SchoolYearWizard } from "@/components/admin/school-year-wizard";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { latestTeamYear, wizardYears, yearRoster } from "@/lib/members/years";
import { startNewSchoolYear } from "./actions";

export const metadata: Metadata = { title: "Шинэ хичээлийн жил" };

/**
 * «Шинэ хичээлийн жил эхлүүлэх»: 1 the years, 2 the new leaders (existing or new people),
 * 3 members to copy (nobody by default), 4 confirm, 5 summary. Nothing is deleted.
 */
export default async function SchoolYearPage() {
  await requireAdmin();
  const db = await getDb();
  const [current, latest] = await Promise.all([getCurrentSchoolYear(), latestTeamYear(db)]);
  const { from, to } = wizardYears(latest, current);
  const [roster, people] = await Promise.all([
    from ? yearRoster(db, from) : Promise.resolve([]),
    db
      .select({ id: members.id, name: members.name, className: members.className })
      .from(members)
      .where(and(eq(members.anonymized, false)))
      .orderBy(asc(members.name)),
  ]);
  return (
    <>
      <AdminPageHeader
        title="Шинэ хичээлийн жил эхлүүлэх"
        description="Шинэ жилийн удирдлагыг сонгож, хүсвэл гишүүдийг хуулна. Өмнөх жилийн мэдээлэл түүх болж хэвээр үлдэнэ — юу ч устгахгүй."
      />
      <SchoolYearWizard
        from={from}
        to={to}
        current={current}
        leaders={roster
          .filter((r) => r.role === "leadership")
          .map((r) => ({
            memberId: r.memberId,
            name: r.name,
            className: r.className,
            position: r.position,
            positionEn: r.positionEn ?? "",
          }))}
        members={roster
          .filter((r) => r.role === "member")
          .map((r) => ({ id: r.memberId, name: r.name, className: r.className }))}
        people={people}
        start={startNewSchoolYear}
      />
    </>
  );
}
