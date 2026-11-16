/** Member area rules: school years, hours totals, active-member progress, event sign-up. */
import { describe, expect, test } from "bun:test";
import {
  activeProgress,
  isActiveMember,
  memberYearTotals,
  parseHours,
  schoolYearOf,
  schoolYearOptions,
  signupOpen,
  signupStatusFor,
  suggestedEventHours,
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

describe("attendance and yearly totals", () => {
  test("suggested hours from the event length", () => {
    const s = new Date(Date.UTC(2026, 10, 20, 2));
    const at = (h: number) => new Date(s.getTime() + h * 3_600_000);
    expect(suggestedEventHours({ startsAt: s, endsAt: at(2.2), allDay: false })).toBe(2);
    expect(suggestedEventHours({ startsAt: s, endsAt: at(0.1), allDay: false })).toBe(0.5);
    expect(suggestedEventHours({ startsAt: s, endsAt: at(30), allDay: false })).toBe(12);
    expect(suggestedEventHours({ startsAt: s, endsAt: null, allDay: false })).toBeNull();
    expect(suggestedEventHours({ startsAt: s, endsAt: at(3), allDay: true })).toBeNull();
  });

  test("hours input", () => {
    expect(parseHours("2,5")).toBe(2.5);
    expect(parseHours(1.3)).toBe(1.25);
    for (const bad of ["", "0", "-1", "25", "abc", null]) expect(parseHours(bad)).toBeNull();
  });

  test("per-member totals for a year (imported total only for the member's own year)", () => {
    const members = [
      { id: "a", schoolYear: "2025-2026", volunteerHours: 40 },
      { id: "b", schoolYear: "2026-2027", volunteerHours: null },
    ];
    const entries = [
      { memberId: "a", schoolYear: "2026-2027", hours: 2 },
      { memberId: "b", schoolYear: "2026-2027", hours: 1.5 },
      { memberId: "b", schoolYear: "2026-2027", hours: 3 },
      { memberId: null, schoolYear: "2026-2027", hours: 9 },
      { memberId: "b", schoolYear: "2025-2026", hours: 5 },
    ];
    const y = memberYearTotals(members, entries, "2026-2027");
    expect(y.get("a")).toEqual({ logged: 2, imported: 0, total: 2 });
    expect(y.get("b")).toEqual({ logged: 4.5, imported: 0, total: 4.5 });
    expect(memberYearTotals(members, entries, "2025-2026").get("a")?.total).toBe(40);
  });

  test("active member threshold and year options", () => {
    expect(isActiveMember(20, 20)).toBe(true);
    expect(isActiveMember(19.5, 20)).toBe(false);
    expect(isActiveMember(100, null)).toBe(false);
    expect(schoolYearOptions(["2025-2026", null, "bad"], Date.UTC(2026, 9, 1))).toEqual([
      "2026-2027",
      "2025-2026",
    ]);
  });
});
