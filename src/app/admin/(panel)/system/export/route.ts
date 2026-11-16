import { getDb } from "@/db";
import {
  albums,
  events,
  faqs,
  images,
  impactStats,
  members,
  news,
  recruitmentPeriods,
  settings,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Content export (JSON) for hand-over and archiving. Personal data stays out: no applications,
 * accounts, contact messages or audit log; members without e-mail, account link or hours.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (me.role !== "admin") return new Response("Forbidden", { status: 403 });
  const db = await getDb();
  const [n, e, a, img, m, impact, s, f, periods] = await Promise.all([
    db.select().from(news),
    db.select().from(events),
    db.select().from(albums),
    db.select().from(images),
    db.select().from(members),
    db.select().from(impactStats),
    db.select().from(settings),
    db.select().from(faqs),
    db.select().from(recruitmentPeriods),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    note: "Content only. Applications, accounts, messages and per-person hours are not included.",
    news: n,
    events: e,
    albums: a,
    images: img,
    members: m
      .filter((x) => !x.anonymized)
      .map((x) => {
        const row: Partial<typeof x> = { ...x };
        delete row.email;
        delete row.userId;
        delete row.volunteerHours;
        return row;
      }),
    impactStats: impact,
    settings: s,
    faqs: f,
    recruitmentPeriods: periods,
  };
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="club-content-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
