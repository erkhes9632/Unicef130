import { describe, expect, test } from "bun:test";
import { fitDescription, META_DESCRIPTION } from "@/lib/meta-description";

const club = "130-р сургуулийн UNICEF клуб";
const len = (s: string) => [...s].length;

describe("meta descriptions stay between 70 and 155 characters", () => {
  test("short text gets the club name", () => {
    const d = fitDescription("Клубын шинэ мэдээ, хийсэн ажлууд, түүхүүд.", club);
    expect(d).toBe("Клубын шинэ мэдээ, хийсэн ажлууд, түүхүүд. 130-р сургуулийн UNICEF клуб.");
    expect(len(d)).toBeGreaterThanOrEqual(META_DESCRIPTION.min);
  });
  test("long text is cut at a word with an ellipsis", () => {
    const d = fitDescription("үг ".repeat(80), club);
    expect(len(d)).toBeLessThanOrEqual(META_DESCRIPTION.max);
    expect(d.endsWith("…")).toBe(true);
    expect(d).not.toMatch(/\s…$/);
  });
  test("text in range is kept", () => {
    const t = "а".repeat(100);
    expect(fitDescription(t, club)).toBe(t);
  });
});
