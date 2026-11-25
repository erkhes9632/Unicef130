/**
 * Yearly report checks. The report itself is private (private/, not in git): these tests are
 * skipped on a fresh clone and run wherever the files exist. They never print names.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { parseSdgList, SDGS } from "@/lib/sdg";
import { manifestSchema, reportSchema, type Report } from "../scripts/report/types";

const FILE = "private/report-2025-2026.json";
const MANIFEST = "private/report-media/manifest.json";
const SQL = "private/import-2025-2026.sql";
const has = existsSync(FILE) && existsSync(MANIFEST);
const PHONE = /(?<![\d.])\d{8}(?![\d.])/;

describe.skipIf(!has)("2025–2026 report data", () => {
  const r = has ? reportSchema.parse(JSON.parse(readFileSync(FILE, "utf8"))) : (null as never);
  const row = (p: string) => r.totals.find((x) => x.pillar === p)!;
  const listed = (p: Report["activities"][number]["pillar"]) =>
    r.activities.filter((a) => a.pillar === p);

  test("volunteer hours of the 52 active members add up to 734", () => {
    expect(r.activeMembers).toHaveLength(r.membership.active);
    expect(r.membership.active).toBe(52);
    expect(r.activeMembers.reduce((s, m) => s + m.hours, 0)).toBe(734);
    expect(r.membership.hours).toBe(734);
  });

  test("home numbers match the official totals", () => {
    expect(r.membership.totalJoined).toBe(115);
    expect(row("total")).toMatchObject({
      activities: 12,
      inPerson: 2489,
      online: 101173,
      total: 103662,
      raised: 855000,
    });
  });

  test("pillar rows add up to the total row", () => {
    const pillars = r.totals.filter((x) => x.pillar !== "total");
    for (const k of ["activities", "inPerson", "online", "total", "raised"] as const)
      expect(pillars.reduce((s, x) => s + x[k], 0)).toBe(row("total")[k]);
    for (const x of r.totals) expect(x.inPerson + x.online).toBe(x.total);
  });

  test("listed activities: the known gaps are exactly as reported", () => {
    const sum = (p: Parameters<typeof listed>[0], f: (a: Report["activities"][number]) => number) =>
      listed(p).reduce((s, a) => s + f(a), 0);
    expect(r.activities).toHaveLength(11);
    expect(listed("education")).toHaveLength(4);
    expect(row("advocacy").online - sum("advocacy", (a) => a.online)).toBe(2);
    expect(sum("education", (a) => a.online)).toBe(row("education").online);
    expect(sum("fundraising", (a) => a.online)).toBe(row("fundraising").online);
    expect(sum("fundraising", (a) => a.raised ?? 0)).toBe(row("fundraising").raised);
  });

  test("≈ and + are flags next to the number", () => {
    const a = (n: number) => r.activities.find((x) => x.n === n)!.inPerson;
    expect(a(2)).toMatchObject({ value: 500, approx: true, label: "≈500" });
    expect(a(9)).toMatchObject({ value: 50, atLeast: true, label: "50+" });
    expect(a(4)).toMatchObject({ value: null, label: "Сургуулийн хүрээлэл" });
  });

  test("no phone numbers in the JSON, the manifest or the SQL", () => {
    const strip = (s: string) => s.replace(/"(sha256|md5|thumbMd5|mediumMd5)": "[0-9a-f]+"/g, "");
    expect(strip(readFileSync(FILE, "utf8"))).not.toMatch(PHONE);
    expect(strip(readFileSync(MANIFEST, "utf8"))).not.toMatch(PHONE);
    if (existsSync(SQL)) expect(readFileSync(SQL, "utf8")).not.toMatch(PHONE);
  });

  test("photos: kept ones have alt text in both languages and no names", () => {
    const m = manifestSchema.parse(JSON.parse(readFileSync(MANIFEST, "utf8")));
    const names = [
      ...r.activeMembers.flatMap((x) => [x.name, x.nameEn]),
      ...r.leaders.map((x) => x.name),
    ];
    for (const img of m.images.filter((i) => i.keep)) {
      expect(img.alt.length).toBeGreaterThan(10);
      expect(img.altEn.length).toBeGreaterThan(10);
      expect(img.output!.key).toMatch(/^content\/2025-2026\/[a-z0-9-]+\/\d{2}\.webp$/);
      for (const n of names) {
        expect(img.alt).not.toContain(n);
        expect(img.altEn).not.toContain(n);
      }
    }
    for (const img of m.images.filter((i) => !i.keep)) expect(img.reason).not.toBe("");
  });

  test.skipIf(!existsSync(SQL))("public content in the SQL holds no member names", () => {
    const sql = readFileSync(SQL, "utf8");
    const publicPart = sql
      .split("\n")
      .filter((l) => !l.startsWith('INSERT INTO "members"'))
      .join("\n");
    for (const n of [
      ...r.activeMembers.flatMap((x) => [x.name, x.nameEn]),
      ...r.leaders.map((x) => x.name),
    ])
      expect(publicPart).not.toContain(n);
    // Leaders: active = 1, show_publicly = 0.
    const leaders = sql
      .split("\n")
      .filter((l) => l.startsWith('INSERT INTO "members"') && l.includes("'leadership'"));
    expect(leaders).toHaveLength(5);
    for (const l of leaders) expect(l).toMatch(/'leadership', \d+, 1, 0, /);
  });
});

describe("SDG helpers", () => {
  test("parses typos from source data", () => {
    expect(parseSdgList("SDg 10, SD 16, SDG1, sdg 3")).toEqual([1, 3, 10, 16]);
    expect(parseSdgList("SDG 18, SDG 0")).toEqual([]);
  });
  test("badge text (white or black) meets WCAG AA on every official colour", () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    for (let n = 1; n <= 17; n++) {
      const bg = lum(SDGS[n]!.color);
      const ratio = SDGS[n]!.text === "light" ? 1.05 / (bg + 0.05) : (bg + 0.05) / 0.05;
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
  test("all 17 goals have colors and names", () => {
    for (let n = 1; n <= 17; n++) {
      expect(SDGS[n]!.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(SDGS[n]!.mn.length).toBeGreaterThan(3);
    }
  });
});
