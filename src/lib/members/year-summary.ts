import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { members, volunteerHours } from "@/db/schema";
import { isActiveMember, memberYearTotals } from "./logic";

/**
 * One school year's hours per member (admin page, CSV, public "active members" wall). Anonymized
 * rows (deleted accounts) count in `totalAll` only — never listed.
 */
export async function yearSummary(db: Database, year: string, threshold: number | null) {
  const [rows, entries] = await Promise.all([
    db.select().from(members).orderBy(asc(members.className), asc(members.name)),
    db
      .select({
        memberId: volunteerHours.memberId,
        schoolYear: volunteerHours.schoolYear,
        hours: volunteerHours.hours,
      })
      .from(volunteerHours)
      .where(eq(volunteerHours.schoolYear, year)),
  ]);
  const totals = memberYearTotals(rows, entries, year);
  const listed = rows
    .filter((m) => !m.anonymized)
    .map((m) => {
      const t = totals.get(m.id)!;
      return { member: m, ...t, active: isActiveMember(t.total, threshold) };
    })
    .filter((r) => r.member.active || r.total > 0);
  const totalAll =
    Math.round(entries.reduce((s, e) => s + e.hours, 0) * 100) / 100 +
    rows.reduce((s, m) => s + (m.schoolYear === year ? (m.volunteerHours ?? 0) : 0), 0);
  return { listed, totalAll };
}
