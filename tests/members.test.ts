/** Member area rules: school years, hours totals, active-member progress, event sign-up. */
import { describe, expect, test } from "bun:test";
import {
  activeProgress,
  schoolYearOf,
  signupOpen,
  signupStatusFor,
  yearTotals,
} from "@/lib/members/logic";

describe("school year (starts 1 September, Ulaanbaatar time)", () => {
  test("boundaries", () => {
    expect(schoolYearOf(Date.UTC(2026, 9, 1))).toBe("2026-2027");
    expect(schoolYearOf(Date.UTC(2027, 4, 31))).toBe("2026-2027");
    expect(schoolYearOf(Date.UTC(2026, 7, 31, 12))).toBe("2025-2026");
    // 31 Aug 17:00 UTC is already 1 Sep 01:00 in Ulaanbaatar.
    expect(schoolYearOf(Date.UTC(2026, 7, 31, 17))).toBe("2026-2027");
  });
});

describe("hours", () => {
  test("logged entries + the imported report total, newest year first", () => {
    expect(
      yearTotals(
        [
          { schoolYear: "2026-2027", hours: 2.5 },
          { schoolYear: "2026-2027", hours: 1 },
          { schoolYear: "2025-2026", hours: 3 },
        ],
        { schoolYear: "2025-2026", hours: 40 },
      ),
    ).toEqual([
      { schoolYear: "2026-2027", hours: 3.5 },
      { schoolYear: "2025-2026", hours: 43 },
    ]);
    expect(yearTotals([], { schoolYear: null, hours: 12 })).toEqual([]);
  });

  test("progress to the active-member threshold (hidden when not set)", () => {
    expect(activeProgress(10, 40)).toBe(25);
    expect(activeProgress(80, 40)).toBe(100);
    expect(activeProgress(10, null)).toBeNull();
    expect(activeProgress(10, 0)).toBeNull();
  });
});

describe("event sign-up", () => {
  const starts = new Date(Date.UTC(2026, 10, 20, 2));
  const event = { signupEnabled: true, signupCapacity: 2, signupDeadline: null, startsAt: starts };

  test("open until the deadline, or until the event starts", () => {
    expect(signupOpen(event, starts.getTime() - 1)).toBe(true);
    expect(signupOpen(event, starts.getTime())).toBe(false);
    const deadline = new Date(starts.getTime() - 86_400_000);
    expect(signupOpen({ ...event, signupDeadline: deadline }, deadline.getTime() + 1)).toBe(false);
    expect(signupOpen({ ...event, signupEnabled: false }, 0)).toBe(false);
  });

  test("places first, then the waitlist; no capacity = no limit", () => {
    expect(signupStatusFor(event, 1)).toBe("registered");
    expect(signupStatusFor(event, 2)).toBe("waitlist");
    expect(signupStatusFor({ ...event, signupCapacity: null }, 500)).toBe("registered");
  });
});
