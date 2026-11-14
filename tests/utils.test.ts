import { describe, expect, test } from "bun:test";
import { csvCell, toCsv } from "@/lib/csv";
import { formatDate, formatTimeRange, fromIsoDate } from "@/lib/dates/format";
import { buildIcs } from "@/lib/dates/ics";
import { parseUbInputValue, toUbInputValue } from "@/lib/dates/ub-input";
import { monthGrid, parseMonth, shiftMonth } from "@/lib/dates/ub-time";
import { hasRole } from "@/lib/auth/roles";

describe("csv", () => {
  test("quotes and guards formulas", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("+97688112233")).toBe("+97688112233");
    expect(csvCell(null)).toBe("");
    expect(toCsv([["а", "б"]]).startsWith("﻿а,б\r\n")).toBe(true);
  });
});

describe("dates (Ulaanbaatar, UTC+8)", () => {
  const d = "2026-11-20T08:30:00+08:00";
  test("Mongolian formats don't depend on Intl locale data", () => {
    expect(formatDate("mn", d, "long")).toBe("2026 оны 11-р сарын 20");
    expect(formatDate("mn", d, "full")).toBe("2026 оны 11-р сарын 20, Баасан гараг");
    expect(formatDate("mn", d, "monthShort")).toBe("11-р сар");
    expect(formatDate("mn", d, "time")).toBe("08:30");
    expect(formatDate("en", d, "long")).toBe("November 20, 2026");
  });
  test("UB day boundary (23:30 UTC = next day in UB)", () => {
    expect(formatDate("mn", "2026-11-19T23:30:00Z", "day")).toBe("20");
  });
  test("time ranges", () => {
    expect(formatTimeRange("mn", d, "2026-11-20T16:00:00+08:00")).toBe("08:30–16:00");
    expect(formatTimeRange("mn", d, null)).toBe("08:30");
    expect(formatTimeRange("mn", d, "2026-11-21T10:00:00+08:00")).toContain("–");
  });
  test("datetime-local round trip in UB time", () => {
    const date = parseUbInputValue("2026-11-20T08:30")!;
    expect(date.toISOString()).toBe("2026-11-20T00:30:00.000Z");
    expect(toUbInputValue(date)).toBe("2026-11-20T08:30");
    expect(parseUbInputValue("garbage")).toBeNull();
    expect(fromIsoDate("2026-06-01").toISOString()).toBe("2026-06-01T04:00:00.000Z");
  });
  test("month grid is Monday-first", () => {
    const g = monthGrid(2026, 11); // Nov 1 2026 is a Sunday
    expect(g[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(g.flat().filter(Boolean).length).toBe(30);
    expect(parseMonth("2026-02")).toEqual({ year: 2026, month: 2 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
  test("ics escapes and folds", () => {
    const ics = buildIcs({
      uid: "1@x",
      title: "А, Б; В",
      description: "x\ny",
      location: "Л",
      start: new Date(Date.UTC(2026, 10, 20, 0, 30)),
      end: new Date(Date.UTC(2026, 10, 20, 8)),
      url: "https://x",
    });
    expect(ics).toContain("DTSTART:20261120T003000Z");
    expect(ics).toContain("SUMMARY:А\\, Б\\; В");
    expect(ics).toContain("DESCRIPTION:x\\ny");
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe("roles", () => {
  test("admin ≥ editor", () => {
    expect(hasRole("admin", "editor")).toBe(true);
    expect(hasRole("editor", "admin")).toBe(false);
    expect(hasRole("user", "editor")).toBe(false);
    expect(hasRole(undefined, "editor")).toBe(false);
  });
});
