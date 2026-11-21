import { and, asc, count, eq } from "drizzle-orm";
import { SHOW_LEADER_NAMES } from "@/config/site";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { schoolYearOf } from "@/lib/members/logic";
import { yearSummary } from "@/lib/members/year-summary";
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
 * Public member lists. Leadership is year-scoped: the latest school year that has leaders is shown
 * (or `leadershipYear` when given and valid). Leaders without a school year are used only when no
 * year-scoped leaders exist. Leaders come back with role only (name "") unless SHOW_LEADER_NAMES
 * is on and the row has consent.
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
  // Leadership roles are public; a leader's name and photo leave the server only when
  // SHOW_LEADER_NAMES is on AND the row has consent (show_publicly).
  const leaders = await db
    .select()
    .from(members)
    .where(and(eq(members.active, true), eq(members.group, "leadership")))
    .orderBy(asc(members.sortOrder), asc(members.name));
  const years = [...new Set(leaders.map((m) => m.schoolYear).filter((y): y is string => !!y))]
    .sort()
    .reverse();
  const year =
    leadershipYear && years.includes(leadershipYear) ? leadershipYear : (years[0] ?? null);
  const [{ hidden } = { hidden: 0 }] = await db
    .select({ hidden: count() })
    .from(members)
    .where(
      and(eq(members.active, true), eq(members.showPublicly, false), eq(members.group, "member")),
    );
  const publicMembers = rows.filter((m) => m.group === "member");
  return {
    leadership: leaders
      .filter((m) => (year ? m.schoolYear === year : !m.schoolYear))
      .map((m) =>
        SHOW_LEADER_NAMES && m.showPublicly
          ? toItem(locale, m)
          : { ...toItem(locale, m), name: "", className: "", photoUrl: null },
      ),
    /** School year of the leadership shown ("2025-2026"), null for undated leaders. */
    leadershipYear: year,
    /** All years with leaders, newest first. */
    leadershipYears: years,
    members: publicMembers.map((m) => toItem(locale, m)),
    /** Active members whose names are not public (no consent yet). */
    hiddenCount: hidden,
    /** Active members (public or not, leadership roles not counted) — an aggregate, no names. */
    activeCount: publicMembers.length + hidden,
  };
}

/**
 * "Идэвхтэй гишүүд" of the current school year: members who reached the admin's hours threshold
 * AND whose names are public (consent). Hours are never returned — only the names.
 * Empty when no threshold is set.
 */
export async function listActiveMembers(locale: Locale, threshold: number | null) {
  const year = schoolYearOf(new Date());
  if (!threshold) return { year, names: [] as { id: string; name: string }[] };
  const { listed } = await yearSummary(await getDb(), year, threshold);
  return {
    year,
    names: listed
      .filter((r) => r.active && r.member.showPublicly && r.member.active)
      .map((r) => ({ id: r.member.id, name: pick(locale, r.member.name, r.member.nameEn) }))
      .sort((a, b) => a.name.localeCompare(b.name, "mn")),
  };
}
