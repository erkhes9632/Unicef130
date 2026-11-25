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
    ["Идэвхтэй гишүүн (одоо)", c.members.active, c.members.prevActive],
    ["Өргөдөл", c.applications.inPeriod, c.applications.prevPeriod],
    ["Сайн дурын цаг", c.hours.inPeriod, c.hours.prevPeriod],
    ["Арга хэмжээнд бүртгүүлсэн", c.signups.inPeriod, c.signups.prevPeriod],
    ["Зурвас", c.messages.inPeriod, ""],
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
  rows.push([], ["Сар", "Сайн дурын цаг", "Зурвас"]);
  c.hours.byMonth.forEach((m, i) => rows.push([m.key, m.value, c.messages.byMonth[i]?.value ?? 0]));
  return toCsv(rows);
}
