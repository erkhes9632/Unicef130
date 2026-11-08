import { asc, eq } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { pick } from "./localize";

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
    className: m.className,
    photoUrl: m.showPhoto ? m.photoUrl : null,
  };
}

export async function listMembers(locale: Locale) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(members)
    .where(eq(members.active, true))
    .orderBy(asc(members.sortOrder), asc(members.name));
  return {
    leadership: rows.filter((m) => m.group === "leadership").map((m) => toItem(locale, m)),
    members: rows.filter((m) => m.group === "member").map((m) => toItem(locale, m)),
  };
}
