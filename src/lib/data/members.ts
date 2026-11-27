import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { impactStats, memberYears, members, volunteerHours } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { isSchoolYear } from "@/lib/school-year";
import { displayClassName, pick } from "./localize";

export type MemberItem = {
  id: string;
  name: string;
  role: string;
  className: string;
  /** Already filtered by the `showPhoto` consent flag. */
  photoUrl: string | null;
};

/** One school year's team as the public site shows it (names only with consent). */
export type YearTeam = {
  year: string;
  /** Leaders in their order; `name` is "" when the name is not public (role only). */
  leaders: MemberItem[];
  /** Members marked public for this year, sorted by name (a plain name list). */
  members: { id: string; name: string }[];
  /** Members of the year (official report figure when the year has one, else the roster). */
  memberCount: number;
  leaderCount: number;
  /** Members whose names are not public (no consent for this year). */
  hiddenCount: number;
  /** Volunteer hours of the year: the report figure when there is one, else the logged sum. */
  hours: number;
};

/**
 * Every school year that has a team, newest first. One query over `member_years` (indexed by
 * year, role, order) joined with the person; grouping per year happens on the sorted rows.
 * A name (and class, photo) leaves the server only for rows an admin marked «Нийтэд харуулах»
 * for that year after confirming parental consent; other leaders come back with the role only.
 */
export async function listTeamsByYear(locale: Locale): Promise<YearTeam[]> {
  const db = await getDb();
  const [rows, report, logged, imported] = await Promise.all([
    db
      .select({
        id: members.id,
        name: members.name,
        nameEn: members.nameEn,
        className: members.className,
        photoUrl: members.photoUrl,
        showPhoto: members.showPhoto,
        year: memberYears.schoolYear,
        role: memberYears.role,
        position: memberYears.position,
        positionEn: memberYears.positionEn,
        showPublicly: memberYears.showPublicly,
      })
      .from(memberYears)
      .innerJoin(members, eq(memberYears.memberId, members.id))
      // Minors' names are only listed after consent (show_publicly), never by default.
      .where(and(eq(members.anonymized, false), eq(members.active, true)))
      .orderBy(
        desc(memberYears.schoolYear),
        asc(memberYears.role),
        asc(memberYears.sortOrder),
        asc(members.name),
      ),
    db
      .select({
        year: impactStats.schoolYear,
        active: impactStats.membersActive,
        hours: impactStats.volunteerHours,
      })
      .from(impactStats)
      .where(eq(impactStats.direction, "total")),
    db
      .select({
        year: volunteerHours.schoolYear,
        hours: sql<number>`coalesce(sum(${volunteerHours.hours}), 0)`,
      })
      .from(volunteerHours)
      .groupBy(volunteerHours.schoolYear),
    db
      .select({
        year: members.schoolYear,
        hours: sql<number>`coalesce(sum(${members.volunteerHours}), 0)`,
      })
      .from(members)
      .groupBy(members.schoolYear),
  ]);
  const reportBy = new Map(report.map((r) => [r.year, r]));
  const loggedBy = new Map(logged.map((r) => [r.year, Number(r.hours)]));
  const importedBy = new Map(imported.map((r) => [r.year, Number(r.hours)]));

  const teams: YearTeam[] = [];
  for (const r of rows) {
    if (!isSchoolYear(r.year)) continue;
    let team = teams.at(-1);
    if (team?.year !== r.year) {
      team = {
        year: r.year,
        leaders: [],
        members: [],
        memberCount: 0,
        leaderCount: 0,
        hiddenCount: 0,
        hours: 0,
      };
      teams.push(team);
    }
    const name = pick(locale, r.name, r.nameEn);
    if (r.role === "leadership") {
      team.leaderCount++;
      team.leaders.push(
        r.showPublicly
          ? {
              id: r.id,
              name,
              role: pick(locale, r.position, r.positionEn),
              className: displayClassName(locale, r.className),
              photoUrl: r.showPhoto ? r.photoUrl : null,
            }
          : {
              id: r.id,
              name: "",
              role: pick(locale, r.position, r.positionEn),
              className: "",
              photoUrl: null,
            },
      );
    } else {
      team.memberCount++;
      if (r.showPublicly) team.members.push({ id: r.id, name });
      else team.hiddenCount++;
    }
  }
  for (const team of teams) {
    team.members.sort((a, b) => a.name.localeCompare(b.name, locale));
    const official = reportBy.get(team.year);
    // The annual report's figure, not a count of rows, when the year has one.
    if (official?.active) team.memberCount = official.active;
    team.hours = official?.hours
      ? official.hours
      : Math.round(((loggedBy.get(team.year) ?? 0) + (importedBy.get(team.year) ?? 0)) * 10) / 10;
  }
  return teams;
}
