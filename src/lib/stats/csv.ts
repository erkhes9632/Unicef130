import { toCsv } from "@/lib/csv";
import type { StatsResponse } from "./types";

/** Aggregates of the selected period as CSV with Mongolian column names (no personal data). */
export function statsCsv(s: StatsResponse) {
  const rows: unknown[][] = [["Үзүүлэлт", "Энэ хугацаанд", "Өмнөх хугацаанд"]];
  const t = s.traffic;
  if (t) {
    rows.push(["Зочид", t.totals.visits, t.prevTotals.visits]);
    rows.push(["Үзсэн хуудас", t.totals.views, t.prevTotals.views]);
  }
  const c = s.club;
  rows.push(
    ["Шинээр бүртгүүлсэн хэрэглэгч", c.users.inPeriod, c.users.prevPeriod],
    ...(c.members.report
      ? [
          [
            `Тайлангийн идэвхтэй гишүүн (${c.members.report.schoolYear})`,
            c.members.report.active,
            "",
          ],
          [
            `Тайлангийн элссэн гишүүн (${c.members.report.schoolYear})`,
            c.members.report.joined,
            "",
          ],
        ]
      : []),
    ["Сайтад бүртгэлтэй гишүүн (одоо)", c.members.site, ""],
    ["Өргөдөл", c.applications.inPeriod, c.applications.prevPeriod],
    ["Сайтад бүртгэсэн сайн дурын цаг", c.hours.inPeriod, c.hours.prevPeriod],
    ["Арга хэмжээнд бүртгүүлсэн", c.signups.inPeriod, c.signups.prevPeriod],
  );
  if (t) {
    rows.push([], ["Огноо", "Зочид", "Үзсэн хуудас"]);
    for (const d of t.series) rows.push([d.key, d.visits, d.views]);
    rows.push([], ["Хуудас", "Үзсэн"]);
    for (const p of t.pages) rows.push([p.path, p.views]);
    rows.push([], ["Хаанаас орж ирсэн", "Үзсэн"]);
    for (const r of t.referrers) rows.push([r.label, r.value]);
    rows.push([], ["Улс", "Үзсэн"]);
    for (const r of t.countries) rows.push([r.label, r.value]);
  }
  rows.push([], ["Өргөдлийн төлөв", "Тоо"]);
  for (const [k, v] of Object.entries(c.applications.byStatus)) rows.push([k, v]);
  rows.push([], ["Хичээлийн жил", "Тайлангийн цаг", "Сайтад бүртгэсэн цаг"]);
  for (const y of c.hours.byYear) rows.push([y.schoolYear, y.report, y.logged]);
  rows.push([], ["Сар", "Сайтад бүртгэсэн цаг"]);
  for (const m of c.hours.byMonth) rows.push([m.key, m.value]);
  return toCsv(rows);
}
