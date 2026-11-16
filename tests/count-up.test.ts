/** Animated counters: parsing free-text stats and formatting the in-between values. */
import { describe, expect, test } from "bun:test";
import { easeOutCubic, formatStat, parseStat } from "@/lib/motion/count-up";

describe("parseStat", () => {
  test("keeps prefix, suffix and the thousands separator", () => {
    const p = parseStat("855,000₮")!;
    expect(p).toEqual({ prefix: "", suffix: "₮", target: 855000, decimals: 0, group: "," });
    expect(formatStat(p, 1234.4)).toBe("1,234₮");
    expect(formatStat(p, 0)).toBe("0₮");
  });

  test("short forms, plain numbers, decimals and spaces", () => {
    expect(parseStat("101K+")).toMatchObject({ target: 101, suffix: "K+" });
    expect(parseStat("12")).toMatchObject({ target: 12, group: "" });
    expect(parseStat("4.5")).toMatchObject({ target: 4.5, decimals: 1 });
    expect(parseStat("1,234.56")).toMatchObject({ target: 1234.56, decimals: 2, group: "," });
    expect(parseStat("2 489")).toMatchObject({ target: 2489, group: " " });
    expect(parseStat("≈ 300+")).toMatchObject({ prefix: "≈ ", target: 300, suffix: "+" });
  });

  test("values that would not round-trip stay static", () => {
    expect(parseStat("олон")).toBeNull();
    expect(parseStat("")).toBeNull();
    expect(parseStat("1,23")).toBeNull(); // odd grouping
    expect(parseStat("2025–2026")).toBeNull(); // two numbers
  });
});

test("easeOutCubic clamps and lands on 1", () => {
  expect(easeOutCubic(-1)).toBe(0);
  expect(easeOutCubic(0)).toBe(0);
  expect(easeOutCubic(1)).toBe(1);
  expect(easeOutCubic(2)).toBe(1);
  expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
});
