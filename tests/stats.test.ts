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
    status: [],
    traffic: null,
    club: {
      users: {
        total: 3,
        inPeriod: 1,
        prevPeriod: 0,
        byRole: { applicant: 1, member: 1, admin: 1 },
        growth: [],
      },
      members: { active: 52, prevActive: 52, growth: [] },
      applications: {
        byStatus: { new: 1, reviewing: 0, interview: 0, accepted: 0, rejected: 0, waitlist: 0 },
        inPeriod: 1,
        prevPeriod: 0,
      },
      hours: { inPeriod: 0, prevPeriod: 0, byMonth: [empty] },
      content: { news: 11, events: 11, albums: 7, photos: 8 },
      messages: { inPeriod: 0, byMonth: [empty] },
      signups: { inPeriod: 0, prevPeriod: 0 },
    },
  };

  test("CSV: aggregates with Mongolian headers, no names", () => {
    const csv = statsCsv(sample);
    expect(csv.split("\r\n")[0]).toBe("﻿Үзүүлэлт,Энэ хугацаанд,Өмнөх хугацаанд");
    expect(csv).toContain("Идэвхтэй гишүүн (одоо),52,52");
    expect(csv).not.toContain("@");
  });

  test("the statistics UI uses no developer jargon", () => {
    for (const f of [
      "src/components/stats/stats-dashboard.tsx",
      "src/lib/stats/status.ts",
      "src/app/admin/(panel)/stats/page.tsx",
    ]) {
      const visible = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(visible).not.toMatch(
        /\b(LCP|INP|CLS|p75|RUM|D1|migration|Unique visitors|Referrers)\b/,
      );
    }
  });
});
