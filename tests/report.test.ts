/**
 * Yearly report checks. The report itself is private (private/, not in git): these tests are
 * skipped on a fresh clone and run wherever the file exists.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { parseSdgList, SDGS } from "@/lib/sdg";

const FILE = "private/report-2025-2026.json";
const SQL = "private/seed-report-2025-2026.sql";
const has = existsSync(FILE);

type Report = {
  membership: { totalJoined: number; active: number };
  activeMembers: { hours: number; latin: string }[];
  activities: { online: number | null; direction: string; donationMnt: number | null }[];
  impactTotals: {
    direction: string;
    activities: number;
    inPerson: number;
    online: number;
    total: number;
    donationMnt: number;
  }[];
};

describe.skipIf(!has)("2025–2026 report arithmetic", () => {
  const r = has ? (JSON.parse(readFileSync(FILE, "utf8")) as Report) : (null as never);
  const row = (d: string) => r.impactTotals.find((x) => x.direction === d)!;

  test("volunteer hours of the 52 active members add up to 734", () => {
    expect(r.activeMembers).toHaveLength(r.membership.active);
    expect(r.membership.active).toBe(52);
    expect(r.activeMembers.reduce((s, m) => s + m.hours, 0)).toBe(734);
  });

  test("home stats match the official totals", () => {
    expect(r.membership.totalJoined).toBe(115);
    expect(row("total").inPerson).toBe(2489);
    expect(row("total").online).toBe(101173);
    expect(row("total").total).toBe(103662);
    expect(row("total").donationMnt).toBe(855000);
  });

  test("direction rows add up to the total row", () => {
    const dirs = r.impactTotals.filter((x) => x.direction !== "total");
    for (const k of ["activities", "inPerson", "online", "total", "donationMnt"] as const) {
      expect(dirs.reduce((s, x) => s + x[k], 0)).toBe(row("total")[k]);
    }
    for (const x of r.impactTotals) expect(x.inPerson + x.online).toBe(x.total);
  });

  test("listed activities: fundraising matches, the known gaps are as reported", () => {
    const sum = (d: string, f: (a: Report["activities"][number]) => number) =>
      r.activities.filter((a) => a.direction === d).reduce((s, a) => s + f(a), 0);
    expect(sum("fundraising", (a) => a.online ?? 0)).toBe(row("fundraising").online);
    expect(sum("fundraising", (a) => a.donationMnt ?? 0)).toBe(row("fundraising").donationMnt);
    expect(sum("education", (a) => a.online ?? 0)).toBe(row("education").online);
    // Known issues flagged to the club (see README): 11 activities listed vs 12 reported, and
    // advocacy online differs by 2 from the listed activities.
    expect(r.activities).toHaveLength(11);
    expect(row("total").activities).toBe(12);
    expect(row("advocacy").online - sum("advocacy", (a) => a.online ?? 0)).toBe(2);
  });

  test.skipIf(!existsSync(SQL))("generated SQL holds no phone numbers or full latin names", () => {
    const sql = readFileSync(SQL, "utf8");
    expect(sql).not.toMatch(/\b(99|88|80|96|95|94|91|89|86|85)\d{6}\b/);
    for (const m of r.activeMembers) expect(sql).not.toContain(m.latin);
    expect(sql).toContain("INSERT OR IGNORE");
  });
});

describe("SDG helpers", () => {
  test("parses typos from source data", () => {
    expect(parseSdgList("SDg 10, SD 16, SDG1, sdg 3")).toEqual([1, 3, 10, 16]);
    expect(parseSdgList("SDG 18, SDG 0")).toEqual([]);
  });
  test("all 17 goals have colors and names", () => {
    for (let n = 1; n <= 17; n++) {
      expect(SDGS[n]!.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(SDGS[n]!.mn.length).toBeGreaterThan(3);
    }
  });
});
