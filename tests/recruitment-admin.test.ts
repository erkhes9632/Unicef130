/** Admin-side recruitment rules: list filters, search, and the period form schema. */
import { describe, expect, test } from "bun:test";
import { matchesSearch, parseApplicationFilters } from "@/lib/recruitment/admin-query";
import { periodInputSchema } from "@/lib/validation/recruitment";

describe("parseApplicationFilters", () => {
  test("empty params → main list defaults (spam hidden, newest first)", () => {
    expect(parseApplicationFilters({})).toEqual({
      period: "",
      status: "",
      className: "",
      from: "",
      to: "",
      q: "",
      sort: "new",
    });
  });

  test("accepts known values from a record or URLSearchParams", () => {
    const expected = {
      period: "p1",
      status: "spam",
      className: "10А",
      from: "2026-09-01",
      to: "2026-09-30",
      q: "Анужин",
      sort: "score",
    };
    const raw = {
      period: "p1",
      status: "spam",
      class: " 10А ",
      from: "2026-09-01",
      to: "2026-09-30",
      q: "  Анужин ",
      sort: "score",
    };
    expect(parseApplicationFilters(raw)).toEqual(expected as never);
    expect(parseApplicationFilters(new URLSearchParams(raw))).toEqual(expected as never);
    expect(parseApplicationFilters({ status: "all" }).status).toBe("all");
    expect(parseApplicationFilters({ period: "none" }).period).toBe("none");
  });

  test("unknown or malformed values fall back instead of reaching the query", () => {
    const f = parseApplicationFilters({
      status: "deleted",
      sort: "drop table",
      from: "2026-9-1",
      to: "yesterday",
      class: "x".repeat(50),
      q: "y".repeat(200),
      period: ["a", "b"],
    });
    expect(f.status).toBe("");
    expect(f.sort).toBe("new");
    expect(f.from).toBe("");
    expect(f.to).toBe("");
    expect(f.className).toHaveLength(10);
    expect(f.q).toHaveLength(80);
    expect(f.period).toBe("");
  });
});

describe("matchesSearch", () => {
  const row = { fullName: "Батын Анужин", phone: "+97688112233", trackingCode: "UC-7KQ2" };

  test("empty query matches everything", () => {
    expect(matchesSearch(row, "")).toBe(true);
  });

  test("name: case-insensitive Cyrillic substring", () => {
    expect(matchesSearch(row, "анужин")).toBe(true);
    expect(matchesSearch(row, "БАТЫН")).toBe(true);
    expect(matchesSearch(row, "Болд")).toBe(false);
  });

  test("phone: digits only, at least 3, separators ignored", () => {
    expect(matchesSearch(row, "8811 2233")).toBe(true);
    expect(matchesSearch(row, "2233")).toBe(true);
    expect(matchesSearch(row, "22")).toBe(false);
    expect(matchesSearch(row, "9999")).toBe(false);
  });

  test("tracking code: case and spaces ignored; missing code never matches", () => {
    expect(matchesSearch(row, "uc-7kq2")).toBe(true);
    expect(matchesSearch(row, "UC- 7KQ2")).toBe(true);
    expect(matchesSearch({ ...row, trackingCode: null }, "uc-7kq2")).toBe(false);
  });
});

describe("periodInputSchema", () => {
  const valid = {
    name: "2026 оны намрын элсэлт",
    nameEn: "",
    schoolYear: "2026-2027",
    opensAt: new Date("2026-09-01T00:00:00+08:00"),
    closesAt: new Date("2026-09-15T18:00:00+08:00"),
    capacity: 40,
    whenFull: "waitlist" as const,
    classes: ["10А", "10Б", "11"],
    introText: "",
    introTextEn: "",
    closedMessage: "",
    closedMessageEn: "",
    questions: [
      {
        id: "q-1",
        type: "choice" as const,
        label: "Аль багт орох вэ?",
        labelEn: "",
        options: [
          { label: "Сурталчилгаа", labelEn: "Outreach" },
          { label: "Сайн дурын ажил", labelEn: "" },
        ],
        required: true,
      },
    ],
    showBanner: true,
    ipLimitPer10Min: 1,
    ipLimitPerDay: 10,
  };
  const issues = (input: unknown) => {
    const r = periodInputSchema.safeParse(input);
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  };

  test("a complete period parses; empty English texts become null", () => {
    const r = periodInputSchema.parse(valid);
    expect(r.nameEn).toBeNull();
    expect(r.introTextEn).toBeNull();
    expect(r.closedMessageEn).toBeNull();
    expect(periodInputSchema.parse({ ...valid, capacity: null }).capacity).toBeNull();
  });

  test("closes must be after opens", () => {
    expect(issues({ ...valid, closesAt: valid.opensAt })).toEqual([
      "closesAt: Хаагдах цаг нь нээгдэх цагаас хойш байх ёстой.",
    ]);
    expect(issues({ ...valid, closesAt: new Date("2026-08-01") })).toHaveLength(1);
  });

  test("a choice question needs at least 2 options; text questions need none", () => {
    const one = { ...valid.questions[0]!, options: [valid.questions[0]!.options[0]!] };
    expect(issues({ ...valid, questions: [one] })).toEqual([
      "questions.0: «Сонголт» төрлийн асуултад дор хаяж 2 сонголт оруулна.",
    ]);
    expect(issues({ ...valid, questions: [{ ...one, type: "text", options: [] }] })).toEqual([]);
  });

  test("question ids must be unique and well-formed", () => {
    const q = valid.questions[0]!;
    expect(issues({ ...valid, questions: [q, q] })).toEqual([
      "questions: Асуултын дугаар давхардсан байна.",
    ]);
    expect(issues({ ...valid, questions: [{ ...q, id: "Q 1" }] })).toHaveLength(1);
  });

  test("limits: questions, options, classes, capacity, school year", () => {
    const q = valid.questions[0]!;
    const many = Array.from({ length: 11 }, (_, i) => ({ ...q, id: `q-${i}` }));
    expect(issues({ ...valid, questions: many })).toEqual([
      "questions: Хамгийн ихдээ 10 нэмэлт асуулт.",
    ]);
    const options = Array.from({ length: 13 }, () => q.options[0]!);
    expect(issues({ ...valid, questions: [{ ...q, options }] })).toEqual([
      "questions.0.options: Асуултад хамгийн ихдээ 12 сонголт.",
    ]);
    expect(issues({ ...valid, classes: Array.from({ length: 121 }, () => "10А") })).toEqual([
      "classes: Хамгийн ихдээ 120 анги.",
    ]);
    expect(issues({ ...valid, classes: ["10-A"] })).toHaveLength(1);
    expect(issues({ ...valid, capacity: 0 })).toEqual(["capacity: Багтаамж дор хаяж 1 байна."]);
    expect(issues({ ...valid, capacity: 2.5 })).toHaveLength(1);
    expect(issues({ ...valid, schoolYear: "2026" })).toEqual([
      "schoolYear: Хичээлийн жилийг 2026-2027 хэлбэрээр бичнэ.",
    ]);
  });

  test("address limits: at least 1, and the daily limit not below the 10-minute one", () => {
    expect(issues({ ...valid, ipLimitPer10Min: 0 })).toEqual([
      "ipLimitPer10Min: 10 минутын хязгаар дор хаяж 1.",
    ]);
    expect(issues({ ...valid, ipLimitPer10Min: 20, ipLimitPerDay: 10 })).toEqual([
      "ipLimitPerDay: Өдрийн хязгаар нь 10 минутын хязгаараас багагүй байна.",
    ]);
    expect(issues({ ...valid, ipLimitPer10Min: 200, ipLimitPerDay: 2000 })).toEqual([]);
  });
});
