import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { memberYears, members, volunteerHours } from "@/db/schema";
import { isActiveMember, memberYearTotals } from "./logic";

/**
 * One school year's hours per member (admin page, CSV, public "active members" wall): the team
 * of that year (`member_years`) plus anyone with hours in it. Hours belong to the person and are
 * summed per year. Anonymized rows (deleted accounts) count in `totalAll` only — never listed.
 */
export async function yearSummary(db: Database, year: string, threshold: number | null) {
  const [rows, entries, team] = await Promise.all([
    db.select().from(members).orderBy(asc(members.className), asc(members.name)),
    db
      .select({
        memberId: volunteerHours.memberId,
        schoolYear: volunteerHours.schoolYear,
        hours: volunteerHours.hours,
      })
      .from(volunteerHours)
      .where(eq(volunteerHours.schoolYear, year)),
    db
      .select({ memberId: memberYears.memberId })
      .from(memberYears)
      .where(eq(memberYears.schoolYear, year)),
  ]);
  const inYear = new Set(team.map((t) => t.memberId));
  const totals = memberYearTotals(rows, entries, year);
  const listed = rows
    .filter((m) => !m.anonymized)
    .map((m) => {
      const t = totals.get(m.id)!;
      return { member: m, ...t, active: isActiveMember(t.total, threshold) };
    })
    .filter((r) => inYear.has(r.member.id) || r.total > 0);
  const totalAll =
    Math.round(entries.reduce((s, e) => s + e.hours, 0) * 100) / 100 +
    rows.reduce((s, m) => s + (m.schoolYear === year ? (m.volunteerHours ?? 0) : 0), 0);
  return { listed, totalAll };
}
