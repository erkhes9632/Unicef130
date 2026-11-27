import "server-only";
import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { memberYears, members, settings, volunteerHours, type MemberYearRole } from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { displayYear, nextSchoolYear, sortYearsDesc } from "@/lib/school-year";
import { SETTINGS_KEYS } from "@/lib/settings/types";

// Helpers for admin Server Actions (they check the role first and pass the acting admin).
// Not a "use server" module: an export there would become a network endpoint.

/** Years that have a team, plus the current one, newest first (admin year switchers). */
export async function teamYearOptions(db: Database, current: string) {
  const rows = await db.selectDistinct({ y: memberYears.schoolYear }).from(memberYears);
  return sortYearsDesc([current, ...rows.map((r) => r.y)]);
}

/** The latest year that has a team (null when none). */
export async function latestTeamYear(db: Database) {
  const [row] = await db
    .select({ y: memberYears.schoolYear })
    .from(memberYears)
    .orderBy(desc(memberYears.schoolYear))
    .limit(1);
  return row?.y ?? null;
}

/**
 * The year the «Шинэ хичээлийн жил эхлүүлэх» wizard creates: the current year while it has no
 * team yet, otherwise the year after the latest team (starting next year early).
 */
export function wizardYears(latest: string | null, current: string) {
  const to = !latest || latest < current ? current : nextSchoolYear(latest);
  return { from: latest, to };
}

/** Next free position at the end of a year's group. */
async function nextSortOrder(db: Database, year: string, role: MemberYearRole) {
  const [row] = await db
    .select({ n: max(memberYears.sortOrder) })
    .from(memberYears)
    .where(and(eq(memberYears.schoolYear, year), eq(memberYears.role, role)));
  return (row?.n ?? 0) + 1;
}

/**
 * Makes a person a member of a school year (once; an existing membership is left as it is).
 * Names stay hidden (`show_publicly` off) until an admin records consent for that year.
 */
export async function addToYear(
  db: Database,
  memberId: string,
  year: string,
  role: MemberYearRole = "member",
  position = role === "leadership" ? "" : "Гишүүн",
  positionEn: string | null = role === "leadership" ? null : "Member",
) {
  await db
    .insert(memberYears)
    .values({
      memberId,
      schoolYear: year,
      role,
      position,
      positionEn,
      sortOrder: await nextSortOrder(db, year, role),
      showPublicly: false,
    })
    .onConflictDoNothing({ target: [memberYears.memberId, memberYears.schoolYear] });
}

export type WizardLeader = {
  /** Existing person, or null for a new one (name + class given). */
  memberId: string | null;
  name: string;
  className: string;
  position: string;
  positionEn: string;
  showPublicly: boolean;
};

/**
 * «Шинэ хичээлийн жил эхлүүлэх»: creates the new year's team — the chosen leaders (existing
 * people or new ones) and the members copied from the previous year. Nothing is deleted or
 * changed in earlier years. Sets «Одоогийн хичээлийн жил» to the new year when it is later than
 * the current one (starting early). One D1 batch for the writes.
 */
export async function startSchoolYear(
  db: Database,
  actor: { id: string },
  input: {
    year: string;
    current: string;
    leaders: WizardLeader[];
    copyMemberIds: string[];
    consent: boolean;
  },
) {
  const now = new Date();
  const existingIds = [
    ...input.leaders.flatMap((l) => (l.memberId ? [l.memberId] : [])),
    ...input.copyMemberIds,
  ];
  const valid = existingIds.length
    ? new Set(
        (
          await db
            .select({ id: members.id })
            .from(members)
            .where(and(inArray(members.id, existingIds), eq(members.anonymized, false)))
        ).map((r) => r.id),
      )
    : new Set<string>();

  const newPeople = input.leaders
    .filter((l) => !l.memberId)
    .map((l) => ({
      id: crypto.randomUUID(),
      name: l.name,
      className: l.className,
      role: l.position,
      roleEn: l.positionEn || null,
      group: "leadership" as const,
      active: true,
      showPublicly: false,
    }));
  let created = 0;
  const leaderRows = input.leaders.flatMap((l, i) => {
    const memberId = l.memberId ?? newPeople[created++]?.id;
    if (!memberId || (l.memberId && !valid.has(l.memberId))) return [];
    const pub = l.showPublicly && input.consent;
    return [
      {
        memberId,
        schoolYear: input.year,
        role: "leadership" as const,
        position: l.position,
        positionEn: l.positionEn || null,
        sortOrder: i + 1,
        showPublicly: pub,
        consentConfirmedAt: pub ? now : null,
        consentConfirmedBy: pub ? actor.id : null,
      },
    ];
  });
  const leaderIds = new Set(leaderRows.map((r) => r.memberId));
  const memberRows = [...new Set(input.copyMemberIds)]
    .filter((id) => valid.has(id) && !leaderIds.has(id))
    .map((memberId, i) => ({
      memberId,
      schoolYear: input.year,
      role: "member" as const,
      position: "Гишүүн",
      positionEn: "Member",
      sortOrder: 100 + i,
      showPublicly: false,
    }));

  const writes = [
    ...(newPeople.length ? [db.insert(members).values(newPeople)] : []),
    ...[...leaderRows, ...memberRows].map((row) =>
      db
        .insert(memberYears)
        .values(row)
        .onConflictDoNothing({ target: [memberYears.memberId, memberYears.schoolYear] }),
    ),
    ...(input.year > input.current
      ? [
          db
            .insert(settings)
            .values({ key: SETTINGS_KEYS.schoolYear, value: { current: input.year } })
            .onConflictDoUpdate({
              target: settings.key,
              set: { value: sql`excluded.value`, updatedAt: now },
            }),
        ]
      : []),
  ];
  const [first, ...rest] = writes;
  if (first) await db.batch([first, ...rest]);
  await logActivity(actor, "school_year.start", {
    type: "settings",
    summary: `${displayYear(input.year)} хичээлийн жилийг эхлүүлэв: удирдлага ${leaderRows.length}, гишүүн ${memberRows.length}${newPeople.length ? ` (шинэ хүн ${newPeople.length}: ${newPeople.map((p) => `#${shortId(p.id)}`).join(", ")})` : ""}`,
  });
  return { leaders: leaderRows.length, members: memberRows.length, created: newPeople.length };
}

/** A year's team for the wizard (previous year's leaders and members to pick from). */
export async function yearRoster(db: Database, year: string) {
  return db
    .select({
      memberId: members.id,
      name: members.name,
      className: members.className,
      role: memberYears.role,
      position: memberYears.position,
      positionEn: memberYears.positionEn,
    })
    .from(memberYears)
    .innerJoin(members, eq(memberYears.memberId, members.id))
    .where(and(eq(memberYears.schoolYear, year), eq(members.anonymized, false)))
    .orderBy(asc(memberYears.role), asc(memberYears.sortOrder), asc(members.name));
}

/** Dashboard tiles of one school year: team sizes and volunteer hours (aggregates only). */
export async function yearTotalsForDashboard(db: Database, year: string) {
  const [[team], [logged], [imported]] = await Promise.all([
    db
      .select({
        leaders: sql<number>`coalesce(sum(CASE WHEN ${memberYears.role} = 'leadership' THEN 1 ELSE 0 END), 0)`,
        members: sql<number>`coalesce(sum(CASE WHEN ${memberYears.role} = 'member' THEN 1 ELSE 0 END), 0)`,
      })
      .from(memberYears)
      .innerJoin(members, eq(memberYears.memberId, members.id))
      .where(and(eq(memberYears.schoolYear, year), eq(members.anonymized, false))),
    db
      .select({ n: sql<number>`coalesce(sum(${volunteerHours.hours}), 0)` })
      .from(volunteerHours)
      .where(eq(volunteerHours.schoolYear, year)),
    db
      .select({ n: sql<number>`coalesce(sum(${members.volunteerHours}), 0)` })
      .from(members)
      .where(eq(members.schoolYear, year)),
  ]);
  return {
    leaders: Number(team?.leaders ?? 0),
    members: Number(team?.members ?? 0),
    hours: Math.round((Number(logged?.n ?? 0) + Number(imported?.n ?? 0)) * 10) / 10,
  };
}
