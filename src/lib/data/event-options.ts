import "server-only";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";

/** Admin selects: activities, newest first. */
export async function listEventOptions(limit = 100) {
  const db = await getDb();
  return db
    .select({ id: events.id, title: events.title })
    .from(events)
    .orderBy(desc(events.startsAt))
    .limit(limit);
}
