import { describe, expect, test } from "bun:test";
import { parseUbInputValue } from "@/lib/dates/ub-input";
import {
  buildClassList,
  containsUrl,
  findNextPeriod,
  findOpenPeriod,
  generateTrackingCode,
  givenName,
  intakeFor,
  isCyrillicFullName,
  looksLikeGibberish,
  memberDisplayName,
  MIN_FILL_MS,
  normalizeMnPhone,
  normalizeTrackingCode,
  parseClassList,
  periodPhase,
  periodsOverlap,
  publicStatus,
  SPAM_THRESHOLD,
  spamScore,
} from "@/lib/recruitment/logic";

const ub = (v: string) => parseUbInputValue(v)!;

describe("recruitment window (Asia/Ulaanbaatar)", () => {
  // Admin types local Ulaanbaatar times; they are stored as instants (UTC+8).
  const period = { opensAt: ub("2026-11-20T09:00"), closesAt: ub("2026-12-01T18:00") };

  test("the admin's local times map to the right instants", () => {
    expect(period.opensAt.toISOString()).toBe("2026-11-20T01:00:00.000Z");
    expect(period.closesAt.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });

  test("upcoming → open at the opening minute → closed at the closing minute", () => {
    expect(periodPhase(period, Date.parse("2026-11-20T00:59:59Z"))).toBe("upcoming");
    expect(periodPhase(period, Date.parse("2026-11-20T01:00:00Z"))).toBe("open");
    expect(periodPhase(period, Date.parse("2026-12-01T09:59:59Z"))).toBe("open");
    expect(periodPhase(period, Date.parse("2026-12-01T10:00:00Z"))).toBe("closed");
  });

  test("a visitor in another timezone sees the same state (instants, not wall clocks)", () => {
    // 2026-11-19 20:30 in New York is already 09:30 on the 20th in Ulaanbaatar.
    expect(periodPhase(period, Date.parse("2026-11-19T20:30:00-05:00"))).toBe("open");
  });

  test("open and next period selection; overlap detection", () => {
    const later = { opensAt: ub("2027-03-01T09:00"), closesAt: ub("2027-03-10T18:00") };
    const now = Date.parse("2026-11-25T00:00:00Z");
    expect(findOpenPeriod([later, period], now)).toBe(period);
    expect(findNextPeriod([later, period], now)).toBe(later);
    expect(findOpenPeriod([later, period], Date.parse("2027-01-01T00:00:00Z"))).toBeNull();
    expect(periodsOverlap(period, later)).toBe(false);
    expect(
      periodsOverlap(period, { opensAt: ub("2026-12-01T17:00"), closesAt: ub("2026-12-05T00:00") }),
    ).toBe(true);
    // Back-to-back periods do not overlap.
    expect(
      periodsOverlap(period, { opensAt: ub("2026-12-01T18:00"), closesAt: ub("2026-12-05T00:00") }),
    ).toBe(false);
  });
});

describe("capacity", () => {
  test("accept until full, then waitlist or stop", () => {
    expect(intakeFor({ capacity: null, whenFull: "close" }, 999)).toBe("accept");
    expect(intakeFor({ capacity: 30, whenFull: "waitlist" }, 29)).toBe("accept");
    expect(intakeFor({ capacity: 30, whenFull: "waitlist" }, 30)).toBe("waitlist");
    expect(intakeFor({ capacity: 30, whenFull: "close" }, 30)).toBe("full");
  });
});

describe("classes", () => {
  test("generated and typed lists", () => {
    expect(buildClassList(6, 7, ["а", "б"])).toEqual(["6а", "6б", "7а", "7б"]);
    expect(parseClassList("6а, 6Б  7 в;7в\n12г хог")).toEqual(
      ["6А", "6Б", "7", "В", "7В", "12Г"].filter((c) => /^\d/.test(c)),
    );
  });
});

describe("strict field validation", () => {
  test("names: Cyrillic, at least two parts", () => {
    for (const ok of [
      "Батын Анужин",
      "Б.Анужин",
      "Мөнх-Эрдэнийн Номин-Эрдэнэ",
      "Өлзийн Үүрийнтуяа",
    ])
      expect(isCyrillicFullName(ok)).toBe(true);
    for (const bad of ["Anujin Bat", "Анужин", "Бат 123", "А", "Батын Анужин!!!", "<script>", ""])
      expect(isCyrillicFullName(bad)).toBe(false);
  });

  test("phones: 8 digits starting with 6–9, normalized", () => {
    expect(normalizeMnPhone("8811 2233")).toBe("88112233");
    expect(normalizeMnPhone("+976 8811-2233")).toBe("88112233");
    expect(normalizeMnPhone("97688112233")).toBe("88112233");
    for (const bad of ["1234 5678", "5511 2233", "881122", "881122334", "abcdefgh", ""])
      expect(normalizeMnPhone(bad)).toBeNull();
  });

  test("no links in free text", () => {
    for (const bad of ["http://x.mn үз", "www.spam.com", "bit.ly/abc", "миний сайт casino.xyz"])
      expect(containsUrl(bad)).toBe(true);
    for (const ok of ["Хүүхдүүдэд туслах дуртай. 10А анги.", "И.Бат гэдэг найзтайгаа хамт"])
      expect(containsUrl(ok)).toBe(false);
  });
});

describe("spam score", () => {
  const clean = {
    fillMs: 45_000,
    fullName: "Батын Анужин",
    reason: "Би хүүхдүүдэд ном уншиж өгөх дуртай, клубын ажилд идэвхтэй оролцмоор байна.",
    sameReasonCount: 0,
    sameIpRecent: 0,
  };

  test("a normal application scores 0", () => {
    expect(spamScore(clean)).toEqual({ score: 0, flags: [] });
    expect(MIN_FILL_MS).toBe(4000);
  });

  test("signals add up and cross the threshold", () => {
    const fast = spamScore({ ...clean, fillMs: 5_000 });
    expect(fast.flags).toEqual(["fast_fill"]);
    expect(fast.score).toBeLessThan(SPAM_THRESHOLD);

    const copied = spamScore({ ...clean, fillMs: 5_000, sameReasonCount: 2 });
    expect(copied.flags).toEqual(["fast_fill", "repeated_text"]);
    expect(copied.score).toBeGreaterThanOrEqual(SPAM_THRESHOLD);

    const mash = spamScore({ ...clean, fullName: "Сдфгх Жклзхц", reason: "ааааааааааааааааааа" });
    expect(mash.flags).toContain("gibberish_text");
    expect(mash.flags).toContain("gibberish_name");
    expect(mash.score).toBeGreaterThanOrEqual(SPAM_THRESHOLD);

    expect(spamScore({ ...clean, sameIpRecent: 2 }).flags).toEqual([]);
    expect(spamScore({ ...clean, sameIpRecent: 6 }).score).toBe(50);
    expect(spamScore({ ...clean, reason: "хөөх хөөх хөөх хөөх хөөх" }).flags).toContain(
      "repeated_words",
    );
  });

  test("gibberish detector does not flag real Mongolian or English text", () => {
    for (const ok of [clean.reason, "Номин-Эрдэнэ", "I want to help children in my school."])
      expect(looksLikeGibberish(ok)).toBe(false);
    for (const bad of ["qwrtpsdfg", "ккккккккк", "ababababababab"])
      expect(looksLikeGibberish(bad)).toBe(true);
  });
});

describe("tracking codes and public status", () => {
  test("format, normalization, no ambiguous characters", () => {
    for (let i = 0; i < 200; i++) expect(generateTrackingCode()).toMatch(/^UC-[2-9A-HJKMNP-Z]{4}$/);
    expect(normalizeTrackingCode(" uc-7k3m ")).toBe("UC-7K3M");
    expect(normalizeTrackingCode("7K3M")).toBe("UC-7K3M");
    expect(normalizeTrackingCode("UC7K3M")).toBe("UC-7K3M");
    expect(normalizeTrackingCode("UC-7K3")).toBeNull();
    expect(normalizeTrackingCode("UC-7K3O")).toBeNull(); // O is not in the alphabet
    expect(normalizeTrackingCode("'; DROP TABLE")).toBeNull();
  });

  test("the applicant never sees internal states", () => {
    expect(publicStatus("new")).toBe("received");
    expect(publicStatus("reviewing")).toBe("received");
    expect(publicStatus("spam")).toBe("received");
    expect(publicStatus("interview")).toBe("interview");
    expect(publicStatus("accepted")).toBe("accepted");
    expect(publicStatus("waitlist")).toBe("waitlist");
    expect(publicStatus("rejected")).toBe("declined");
  });

  test("names for the status page and the member list", () => {
    expect(givenName("Батын Анужин")).toBe("Анужин");
    expect(givenName("Б.Анужин")).toBe("Анужин");
    expect(memberDisplayName("Батын Анужин")).toBe("Б.Анужин");
    expect(memberDisplayName("б.анужин")).toBe("Б.анужин");
    expect(memberDisplayName("Мөнх-Эрдэнийн Номин-Эрдэнэ")).toBe("М.Номин-Эрдэнэ");
  });
});
