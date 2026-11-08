import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { applicationStatusLabel, helpOptionLabel } from "@/lib/admin/labels";
import { formatDate } from "@/lib/dates/format";
import { appendSheetRow, sheetsConfigFromEnv } from "@/lib/integrations/google-sheets";

export type SyncResult = "synced" | "skipped" | "error" | "not_found";

/** Column order in the Google Sheet (put these headers in row 1). */
export const SHEET_HEADERS = [
  "Огноо",
  "Овог нэр",
  "Анги",
  "Утас",
  "И-мэйл",
  "Шалтгаан",
  "Туслах чиглэл",
  "Төлөв",
  "ID",
];

export async function isSheetsConfigured() {
  const { env } = await getCloudflareContext({ async: true });
  return sheetsConfigFromEnv(env) !== null;
}

/** Appends one application to the Google Sheet and records the result in D1. Never throws. */
export async function syncApplicationToSheets(id: string): Promise<SyncResult> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const cfg = sheetsConfigFromEnv(env);
    if (!cfg) {
      console.info("[sheets] Google Sheets not configured — skipping sync for application", id);
      return "skipped";
    }
    const db = await getDb();
    const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    if (!app) return "not_found";
    try {
      await appendSheetRow(cfg, [
        `${formatDate("mn", app.createdAt, "long")} ${formatDate("mn", app.createdAt, "time")}`,
        app.fullName,
        app.className,
        app.phone,
        app.email ?? "",
        app.reason,
        app.helpWith.map((h) => helpOptionLabel[h] ?? h).join(", "),
        applicationStatusLabel[app.status],
        app.id,
      ]);
      await db
        .update(applications)
        .set({ sheetsSyncedAt: new Date(), sheetsError: null })
        .where(eq(applications.id, id));
      return "synced";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[sheets] sync failed", id, message);
      await db
        .update(applications)
        .set({ sheetsError: message.slice(0, 500) })
        .where(eq(applications.id, id));
      return "error";
    }
  } catch (err) {
    console.error("[sheets] unexpected error", err);
    return "error";
  }
}

/** Runs work after the response is sent (Workers `waitUntil`); falls back to awaiting it. */
export async function runInBackground(task: Promise<unknown>) {
  try {
    const { ctx } = await getCloudflareContext({ async: true });
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
  } catch {
    // not in a Workers context
  }
  await task;
}
