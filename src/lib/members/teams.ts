import "server-only";
import { and, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";

/** Team names in use (teams are a free-text field on members; this feeds suggestions/filters). */
export async function listTeams() {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ team: members.team })
    .from(members)
    .where(and(ne(members.team, ""), ne(members.anonymized, true)));
  return rows.map((r) => r.team).sort((a, b) => a.localeCompare(b, "mn"));
}
