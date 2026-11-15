import { and, asc, count, eq } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { displayClassName, pick } from "./localize";

export type MemberItem = {
  id: string;
  name: string;
  role: string;
  className: string;
  /** Already filtered by the `showPhoto` consent flag. */
  photoUrl: string | null;
};

type Row = typeof members.$inferSelect;

function toItem(locale: Locale, m: Row): MemberItem {
  return {
    id: m.id,
    name: pick(locale, m.name, m.nameEn),
    role: pick(locale, m.role, m.roleEn),
    className: displayClassName(locale, m.className),
    photoUrl: m.showPhoto ? m.photoUrl : null,
  };
}

/**
 * Public member lists. Leadership is year-scoped: the latest school year that has public leaders
 * is shown (or `leadershipYear` when given and valid). Leaders without a school year are used only
 * when no year-scoped leaders exist.
 */
export async function listMembers(
  locale: Locale,
  { leadershipYear }: { leadershipYear?: string } = {},
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(members)
    // Minors' names are only listed after consent (show_publicly), never by default.
    .where(and(eq(members.active, true), eq(members.showPublicly, true)))
    .orderBy(asc(members.sortOrder), asc(members.name));
  const leaders = rows.filter((m) => m.group === "leadership");
  const years = [...new Set(leaders.map((m) => m.schoolYear).filter((y): y is string => !!y))]
    .sort()
    .reverse();
  const year =
    leadershipYear && years.includes(leadershipYear) ? leadershipYear : (years[0] ?? null);
  const [{ hidden } = { hidden: 0 }] = await db
    .select({ hidden: count() })
    .from(members)
    .where(and(eq(members.active, true), eq(members.showPublicly, false)));
  return {
    leadership: leaders
      .filter((m) => (year ? m.schoolYear === year : !m.schoolYear))
      .map((m) => toItem(locale, m)),
    /** School year of the leadership shown ("2025-2026"), null for undated leaders. */
    leadershipYear: year,
    /** All years with public leaders, newest first. */
    leadershipYears: years,
    members: rows.filter((m) => m.group === "member").map((m) => toItem(locale, m)),
    /** Active members whose names are not public (no consent yet). */
    hiddenCount: hidden,
  };
}
