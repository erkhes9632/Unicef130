import "server-only";
import { todoItems, type DashboardFacts } from "./todos";

/**
 * The dashboard's "Хийх зүйлс" facts and the newest applications, in ONE D1 batch (indexed
 * counts only, a handful of rows).
 */
export async function dashboardTodos(db: D1Database, now: number) {
  const [newApps, period, faq, noName, latest] = await db.batch<Record<string, unknown>>([
    db.prepare(`SELECT count(*) n FROM applications WHERE status = 'new'`),
    db
      .prepare(
        `SELECT closes_at c FROM recruitment_periods WHERE opens_at <= ? AND closes_at > ? ORDER BY closes_at LIMIT 1`,
      )
      .bind(now, now),
    db.prepare(`SELECT count(*) n, coalesce(sum(published), 0) p FROM faqs`),
    db.prepare(`SELECT count(*) n FROM users WHERE trim(name) = '' AND banned = 0`),
    db.prepare(
      `SELECT id, full_name, class_name, created_at FROM applications WHERE status = 'new' ORDER BY created_at DESC LIMIT 5`,
    ),
  ]);
  const one = (r: typeof newApps) => r?.results[0] ?? {};
  const facts: DashboardFacts = {
    newApplications: Number(one(newApps).n ?? 0),
    recruitmentClosesAt: one(period).c == null ? null : Number(one(period).c),
    faqTotal: Number(one(faq).n ?? 0),
    faqPublished: Number(one(faq).p ?? 0),
    usersWithoutName: Number(one(noName).n ?? 0),
  };
  return {
    todos: todoItems(facts, now),
    latestApplications: (latest?.results ?? []).map((r) => ({
      id: String(r.id),
      fullName: String(r.full_name),
      className: String(r.class_name ?? ""),
      createdAt: Number(r.created_at),
    })),
  };
}
