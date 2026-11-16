import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLog, applications, events, members, news, users } from "@/db/schema";
import { isSheetsConfigured } from "@/lib/applications/sheets-sync";
import { clerkPublishableKey, frontendApiFromPublishableKey } from "@/lib/auth/clerk";
import { resolveTurnstileConfig } from "@/lib/integrations/turnstile";

export type Check = { label: string; state: "ok" | "warn" | "fail"; detail: string };

/**
 * Health of the site's parts for /admin/system. Never shows secret values — only whether they
 * are set (and the Clerk instance type, which the public key already reveals).
 */
export async function systemStatus() {
  const { env } = await getCloudflareContext({ async: true });
  const checks: Check[] = [];
  const db = await getDb();

  let migration = "";
  try {
    const rows = await db.all<{ name: string }>(
      sql`select name from d1_migrations order by id desc limit 1`,
    );
    migration = rows[0]?.name ?? "";
    checks.push({
      label: "D1 өгөгдлийн сан",
      state: "ok",
      detail: `Сүүлийн migration: ${migration || "—"}`,
    });
  } catch (err) {
    checks.push({ label: "D1 өгөгдлийн сан", state: "fail", detail: String(err).slice(0, 120) });
  }

  try {
    await env.MEDIA.list({ limit: 1 });
    checks.push({ label: "R2 зургийн сан", state: "ok", detail: "Холбогдсон" });
  } catch (err) {
    checks.push({ label: "R2 зургийн сан", state: "fail", detail: String(err).slice(0, 120) });
  }

  const pk = clerkPublishableKey();
  const instance = pk.startsWith("pk_live_")
    ? "production"
    : pk.startsWith("pk_test_")
      ? "development"
      : "";
  checks.push({
    label: "Clerk нэвтрэлт",
    state:
      !pk || !process.env.CLERK_SECRET_KEY ? "fail" : instance === "production" ? "ok" : "warn",
    detail: !pk
      ? "Publishable key тохируулаагүй — нэвтрэлт ажиллахгүй"
      : !process.env.CLERK_SECRET_KEY
        ? "CLERK_SECRET_KEY secret алга"
        : `${instance} instance · ${frontendApiFromPublishableKey(pk) ?? "?"}`,
  });
  checks.push({
    label: "Clerk webhook",
    state: process.env.CLERK_WEBHOOK_SIGNING_SECRET ? "ok" : "warn",
    detail: process.env.CLERK_WEBHOOK_SIGNING_SECRET
      ? "Signing secret тохируулсан (/api/webhooks/clerk)"
      : "Тохируулаагүй — хэрэглэгч зөвхөн нэвтрэх үед шинэчлэгдэнэ",
  });

  const turnstile = resolveTurnstileConfig(env);
  checks.push({
    label: "Turnstile (холбоо барих маягт)",
    state: turnstile.status === "ok" ? "ok" : turnstile.status === "test" ? "warn" : "fail",
    detail:
      turnstile.status === "ok"
        ? "Production түлхүүр"
        : turnstile.status === "test"
          ? "Туршилтын түлхүүр (зөвхөн локал)"
          : "Түлхүүр алга — маягт ажиллахгүй",
  });
  checks.push({
    label: "Google Sheets sync",
    state: (await isSheetsConfigured()) ? "ok" : "warn",
    detail: (await isSheetsConfigured()) ? "Тохируулсан" : "Тохируулаагүй (заавал биш)",
  });

  const [
    [admins],
    [memberAccounts],
    [applicants],
    [memberRows],
    [apps],
    [newsCount],
    [eventCount],
    [retention],
  ] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.role, "admin")),
    db.select({ n: count() }).from(users).where(eq(users.role, "member")),
    db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.role} is null`),
    db
      .select({ n: count() })
      .from(members)
      .where(and(eq(members.anonymized, false))),
    db.select({ n: count() }).from(applications),
    db.select({ n: count() }).from(news),
    db.select({ n: count() }).from(events),
    db
      .select({ at: activityLog.createdAt })
      .from(activityLog)
      .where(eq(activityLog.action, "application.retention"))
      .orderBy(desc(activityLog.createdAt))
      .limit(1),
  ]);
  if ((admins?.n ?? 0) < 2)
    checks.push({
      label: "Админ тоо",
      state: "warn",
      detail: "1 л админ байна — хариуцсан багшийг хоёр дахь админ болгохыг зөвлөе",
    });

  return {
    checks,
    siteUrl: env.SITE_URL ?? "",
    counts: {
      admins: admins?.n ?? 0,
      memberAccounts: memberAccounts?.n ?? 0,
      applicants: applicants?.n ?? 0,
      members: memberRows?.n ?? 0,
      applications: apps?.n ?? 0,
      news: newsCount?.n ?? 0,
      events: eventCount?.n ?? 0,
    },
    lastRetention: retention?.at ?? null,
  };
}
