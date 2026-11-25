import "server-only";
import { bucketKeys, type Period } from "./period";
import { APPLICATION_STEPS, type ClubStats, type Point } from "./types";

const UB = 28_800_000; // UTC+8 in ms, for SQL date buckets
const bucketSql = (col: string, bucket: "hour" | "day") =>
  `strftime('${bucket === "hour" ? "%Y-%m-%dT%H" : "%Y-%m-%d"}', (${col} + ${UB}) / 1000, 'unixepoch')`;
const monthSql = (col: string) => `strftime('%Y-%m', (${col} + ${UB}) / 1000, 'unixepoch')`;

type Row = Record<string, number | string | null>;

/** Running total per bucket: `base` before the period plus the additions in each bucket. */
function growth(keys: string[], base: number, added: Row[]): Point[] {
  const by = new Map(added.map((r) => [String(r.k), Number(r.n)]));
  let total = base;
  return keys.map((key) => ({ key, value: (total += by.get(key) ?? 0) }));
}

/** The last 12 months (UB) ending with the period's end, as YYYY-MM keys. */
function lastMonths(to: number) {
  const end = new Date(to + UB);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/**
 * Club numbers from D1, aggregates only, in ONE round trip (D1 batch). Sums/counts per bucket
 * happen in SQL; the browser does the chart maths.
 */
export async function clubStats(db: D1Database, p: Period): Promise<ClubStats> {
  const months = lastMonths(p.to);
  const monthFrom = Date.parse(`${months[0]}-01T00:00:00+08:00`);
  const q = (sql: string, ...args: (number | string)[]) => db.prepare(sql).bind(...args);
  const results = await db.batch<Row>([
    /* 0 */ q(`SELECT count(*) n FROM users`),
    /* 1 */ q(
      `SELECT count(*) n FROM users WHERE created_at >= ? AND created_at < ?`,
      p.from,
      p.to,
    ),
    /* 2 */ q(
      `SELECT count(*) n FROM users WHERE created_at >= ? AND created_at < ?`,
      p.prevFrom,
      p.prevTo,
    ),
    /* 3 */ q(`SELECT coalesce(role, 'applicant') k, count(*) n FROM users GROUP BY k`),
    /* 4 */ q(`SELECT count(*) n FROM users WHERE created_at < ?`, p.from),
    /* 5 */ q(
      `SELECT ${bucketSql("created_at", p.bucket)} k, count(*) n FROM users WHERE created_at >= ? AND created_at < ? GROUP BY k`,
      p.from,
      p.to,
    ),
    /* 6 */ q(
      `SELECT count(*) n FROM members WHERE active = 1 AND "group" = 'member' AND anonymized = 0`,
    ),
    /* 7 */ q(
      `SELECT count(*) n FROM members WHERE active = 1 AND "group" = 'member' AND anonymized = 0 AND created_at < ?`,
      p.prevTo,
    ),
    /* 8 */ q(
      `SELECT count(*) n FROM members WHERE "group" = 'member' AND anonymized = 0 AND created_at < ?`,
      p.from,
    ),
    /* 9 */ q(
      `SELECT ${bucketSql("created_at", p.bucket)} k, count(*) n FROM members WHERE "group" = 'member' AND anonymized = 0 AND created_at >= ? AND created_at < ? GROUP BY k`,
      p.from,
      p.to,
    ),
    /* 10 */ q(
      `SELECT status k, count(*) n FROM applications WHERE created_at >= ? AND created_at < ? GROUP BY status`,
      p.from,
      p.to,
    ),
    /* 11 */ q(
      `SELECT count(*) n FROM applications WHERE created_at >= ? AND created_at < ?`,
      p.prevFrom,
      p.prevTo,
    ),
    /* 12 */ q(
      `SELECT coalesce(sum(hours), 0) n FROM volunteer_hours WHERE date >= ? AND date < ?`,
      p.from,
      p.to,
    ),
    /* 13 */ q(
      `SELECT coalesce(sum(hours), 0) n FROM volunteer_hours WHERE date >= ? AND date < ?`,
      p.prevFrom,
      p.prevTo,
    ),
    /* 14 */ q(
      `SELECT ${monthSql("date")} k, sum(hours) n FROM volunteer_hours WHERE date >= ? AND date < ? GROUP BY k`,
      monthFrom,
      p.to,
    ),
    /* 15 */ q(
      `SELECT (SELECT count(*) FROM news WHERE status = 'published') news, (SELECT count(*) FROM events WHERE published = 1) events, (SELECT count(*) FROM albums WHERE published = 1) albums, (SELECT count(*) FROM images) photos`,
    ),
    /* 16 */ q(
      `SELECT count(*) n FROM contact_messages WHERE created_at >= ? AND created_at < ?`,
      p.from,
      p.to,
    ),
    /* 17 */ q(
      `SELECT ${monthSql("created_at")} k, count(*) n FROM contact_messages WHERE created_at >= ? AND created_at < ? GROUP BY k`,
      monthFrom,
      p.to,
    ),
    /* 18 */ q(
      `SELECT count(*) n FROM event_signups WHERE created_at >= ? AND created_at < ?`,
      p.from,
      p.to,
    ),
    /* 19 */ q(
      `SELECT count(*) n FROM event_signups WHERE created_at >= ? AND created_at < ?`,
      p.prevFrom,
      p.prevTo,
    ),
  ]);
  const rows = (i: number) => results[i]?.results ?? [];
  const n = (i: number) => Number(rows(i)[0]?.n ?? 0);
  const keys = bucketKeys(p.from, p.to, p.bucket);
  const byRole = Object.fromEntries(rows(3).map((r) => [String(r.k), Number(r.n)]));
  const byStatus = Object.fromEntries(rows(10).map((r) => [String(r.k), Number(r.n)]));
  const monthly = (i: number): Point[] => {
    const by = new Map(rows(i).map((r) => [String(r.k), Number(r.n)]));
    return months.map((key) => ({ key, value: by.get(key) ?? 0 }));
  };
  const content = rows(15)[0] ?? {};
  return {
    users: {
      total: n(0),
      inPeriod: n(1),
      prevPeriod: n(2),
      byRole: {
        applicant: byRole.applicant ?? 0,
        member: byRole.member ?? 0,
        admin: byRole.admin ?? 0,
      },
      growth: growth(keys, n(4), rows(5)),
    },
    members: { active: n(6), prevActive: n(7), growth: growth(keys, n(8), rows(9)) },
    applications: {
      byStatus: Object.fromEntries(
        APPLICATION_STEPS.map((s) => [s, byStatus[s] ?? 0]),
      ) as ClubStats["applications"]["byStatus"],
      inPeriod: Object.values(byStatus).reduce((a, b) => a + b, 0),
      prevPeriod: n(11),
    },
    hours: { inPeriod: n(12), prevPeriod: n(13), byMonth: monthly(14) },
    content: {
      news: Number(content.news ?? 0),
      events: Number(content.events ?? 0),
      albums: Number(content.albums ?? 0),
      photos: Number(content.photos ?? 0),
    },
    messages: { inPeriod: n(16), byMonth: monthly(17) },
    signups: { inPeriod: n(18), prevPeriod: n(19) },
  };
}
