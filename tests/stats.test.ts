/** The "activities organised" number must come from the official yearly report everywhere. */
import { describe, expect, mock, test } from "bun:test";

let latestImpact: { total: { activities: number } | null } | null = { total: { activities: 12 } };
mock.module("@/lib/data/impact", () => ({ getLatestImpact: async () => latestImpact }));
// D1 would count 11 published activities: it must NOT be used while a report exists.
const chain = (): unknown =>
  new Proxy(() => {}, {
    get: (_t, prop) =>
      prop === "then" ? (r: (v: unknown) => void) => r([{ n: 11 }]) : () => chain(),
  });
mock.module("@/db", () => ({ getDb: async () => ({ select: () => chain() }) }));

const { getActivityCount, getHomeStats } = await import("@/lib/data/settings");
const { defaultSettings } = await import("@/lib/settings/types");

const settings = {
  ...defaultSettings,
  stats: [
    { kind: "custom" as const, label: "Гишүүн", labelEn: "", value: "115", featured: true },
    { kind: "events" as const, label: "Үйл ажиллагаа", labelEn: "", value: "", featured: false },
  ],
};

describe("single activity-count source", () => {
  test("uses the official report total (12), not the D1 count (11)", async () => {
    expect(await getActivityCount()).toBe(12);
    const all = await getHomeStats("mn", settings, { members: "m", events: "e" });
    expect(all.find((s) => s.label === "Үйл ажиллагаа")?.value).toBe("12");
  });
  test("home band shows only featured stats", async () => {
    const home = await getHomeStats(
      "mn",
      settings,
      { members: "m", events: "e" },
      { featuredOnly: true },
    );
    expect(home.map((s) => s.value)).toEqual(["115"]);
  });
  test("falls back to published activities when there is no report", async () => {
    latestImpact = null;
    expect(await getActivityCount()).toBe(11);
  });
});
