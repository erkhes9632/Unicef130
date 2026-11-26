/** Statistics page: periods, CSV and plain language (no developer jargon in the UI). */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { statsCsv } from "@/lib/stats/csv";
import {
  bucketKeys,
  changePct,
  parsePeriod,
  periodRange,
  schoolYearStart,
} from "@/lib/stats/period";
import type { StatsResponse } from "@/lib/stats/types";

const NOW = Date.parse("2026-11-21T10:00:00+08:00");

describe("periods", () => {
  test("lengths, previous window and buckets", () => {
    const d30 = periodRange("30d", NOW);
    expect(d30.to - d30.from).toBe(30 * 86_400_000);
    expect(d30.prevTo).toBe(d30.from);
    expect(d30.from - d30.prevFrom).toBe(30 * 86_400_000);
    expect(periodRange("24h", NOW).bucket).toBe("hour");
    expect(bucketKeys(d30.from, d30.to, "day")).toHaveLength(31);
    expect(bucketKeys(NOW - 86_400_000, NOW, "hour")).toHaveLength(24);
  });

  test("school year starts on 1 September (Ulaanbaatar)", () => {
    expect(schoolYearStart(NOW)).toBe(Date.parse("2026-09-01T00:00:00+08:00"));
    expect(schoolYearStart(Date.parse("2026-03-01T00:00:00+08:00"))).toBe(
      Date.parse("2025-09-01T00:00:00+08:00"),
    );
    expect(periodRange("year", NOW).from).toBe(Date.parse("2026-09-01T00:00:00+08:00"));
  });

  test("unknown period → 30 days; change in % with nothing to compare → null", () => {
    expect(parsePeriod("x")).toBe("30d");
    expect(changePct(110, 100)).toBeCloseTo(10);
    expect(changePct(5, 0)).toBeNull();
  });
});

describe("CSV and wording", () => {
  const empty = { key: "2026-11", value: 0 };
  const sample: StatsResponse = {
    period: periodRange("7d", NOW),
    traffic: null,
    club: {
      users: {
        total: 3,
        inPeriod: 1,
        prevPeriod: 0,
        byRole: { applicant: 1, member: 1, admin: 1 },
        growth: [],
        withoutName: 1,
      },
      members: {
        report: { schoolYear: "2025-2026", joined: 115, active: 52, hours: 734 },
        site: 1,
      },
      applications: {
        byStatus: { new: 1, reviewing: 0, interview: 0, accepted: 0, rejected: 0, waitlist: 0 },
        inPeriod: 1,
        prevPeriod: 0,
      },
      hours: {
        inPeriod: 0,
        prevPeriod: 0,
        byMonth: [empty],
        byYear: [{ schoolYear: "2025-2026", report: 734, logged: 0 }],
      },
      content: { news: 11, events: 11, albums: 7, photos: 8 },
      signups: { inPeriod: 0, prevPeriod: 0 },
    },
  };

  test("CSV: aggregates with Mongolian headers, no names", () => {
    const csv = statsCsv(sample);
    expect(csv.split("\r\n")[0]).toBe("﻿Үзүүлэлт,Энэ хугацаанд,Өмнөх хугацаанд");
    // The report's figure and website accounts are two separate, labelled rows.
    expect(csv).toContain("Тайлангийн идэвхтэй гишүүн (2025-2026),52,");
    expect(csv).toContain("Сайтад бүртгэлтэй гишүүн (одоо),1,");
    expect(csv).toContain("2025-2026,734,0");
    expect(csv).not.toContain("Зурвас");
    expect(csv).not.toContain("@");
  });

  test("the statistics UI uses no developer jargon", () => {
    for (const f of [
      "src/components/stats/stats-dashboard.tsx",
      "src/lib/stats/status.ts",
      "src/app/admin/(panel)/page.tsx",
    ]) {
      const visible = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(visible).not.toMatch(
        /\b(LCP|INP|CLS|p75|RUM|D1|migration|Unique visitors|Referrers)\b/,
      );
    }
  });
});

describe("dashboard to-dos", () => {
  const base = {
    newApplications: 0,
    recruitmentClosesAt: null,
    faqTotal: 0,
    faqPublished: 1,
    usersWithoutName: 0,
  };
  test("nothing to do → empty list", async () => {
    const { todoItems } = await import("@/lib/stats/todos");
    expect(todoItems(base, NOW)).toEqual([]);
  });
  test("plain sentences with a link for each thing to do", async () => {
    const { todoItems } = await import("@/lib/stats/todos");
    const items = todoItems(
      {
        newApplications: 3,
        recruitmentClosesAt: NOW + 5 * 86_400_000,
        faqTotal: 8,
        faqPublished: 0,
        usersWithoutName: 1,
      },
      NOW,
    );
    expect(items.map((i) => i.text)).toEqual([
      "3 шинэ өргөдөл хүлээж байна",
      "Элсэлт 5 хоногийн дараа хаагдана",
      "Түгээмэл асуулт нийтлэгдээгүй байна (8 ноорог бэлэн)",
      "1 хэрэглэгч нэрээ оруулаагүй",
    ]);
    expect(items.every((i) => i.href?.startsWith("/admin"))).toBe(true);
  });
  test("a far closing date is not a to-do", async () => {
    const { todoItems } = await import("@/lib/stats/todos");
    expect(todoItems({ ...base, recruitmentClosesAt: NOW + 30 * 86_400_000 }, NOW)).toEqual([]);
  });
});

describe("chart axes and the sign-up line", () => {
  test("whole-number steps of 1, 2, 5 × 10^n, at most 6 lines", async () => {
    const { countTicks } = await import("@/lib/stats/ticks");
    expect(countTicks(3).ticks).toEqual([0, 1, 2, 3]);
    expect(countTicks(5).ticks).toEqual([0, 1, 2, 3, 4, 5]);
    expect(countTicks(7).ticks).toEqual([0, 2, 4, 6, 8]);
    expect(countTicks(0).ticks).toEqual([0, 1]);
    expect(countTicks(734).ticks).toEqual([0, 200, 400, 600, 800]);
    for (const v of [1, 3, 9, 13, 58, 101173]) {
      const { ticks, max } = countTicks(v);
      expect(ticks.length).toBeLessThanOrEqual(6);
      expect(ticks.every(Number.isInteger)).toBe(true);
      expect(max).toBeGreaterThanOrEqual(v);
    }
  });
  test("the growth line starts at the first sign-up", async () => {
    const { fromFirstNonZero } = await import("@/lib/stats/ticks");
    const p = (value: number) => ({ key: String(value), value });
    expect(fromFirstNonZero([p(0), p(0), p(1), p(3)]).map((x) => x.value)).toEqual([1, 3]);
    expect(fromFirstNonZero([p(2), p(3)]).map((x) => x.value)).toEqual([2, 3]);
    expect(fromFirstNonZero([p(0), p(0)])).toHaveLength(2);
  });
});
