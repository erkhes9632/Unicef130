/** Admin-side recruitment rules: list filters, search, and the period form schema. */
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { applications } from "@/db/schema";
import { applicationWhere, parseApplicationFilters } from "@/lib/recruitment/admin-query";
import { periodInputSchema } from "@/lib/validation/recruitment";

describe("parseApplicationFilters", () => {
  test("empty params → every status, newest first", () => {
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
      status: "waitlist",
      className: "10А",
      from: "2026-09-01",
      to: "2026-09-30",
      q: "Анужин",
      sort: "class",
    };
    const raw = {
      period: "p1",
      status: "waitlist",
      class: " 10А ",
      from: "2026-09-01",
      to: "2026-09-30",
      q: "  Анужин ",
      sort: "class",
    };
    expect(parseApplicationFilters(raw)).toEqual(expected as never);
    expect(parseApplicationFilters(new URLSearchParams(raw))).toEqual(expected as never);
    expect(parseApplicationFilters({ status: "spam" }).status).toBe("");
    expect(parseApplicationFilters({ sort: "score" }).sort).toBe("new");
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

describe("application search (SQL)", () => {
  const sqlite = new Database(":memory:");
  sqlite.run(
    "CREATE TABLE applications (id TEXT, user_id TEXT, period_id TEXT, full_name TEXT NOT NULL, class_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL)",
  );
  sqlite.run(
    "INSERT INTO applications VALUES ('a1', NULL, NULL, 'Батын Анужин', '10А', '+976 8811-2233', 'anujin@gmail.com', 'new', 1)",
  );
  sqlite.run(
    "INSERT INTO applications VALUES ('a2', NULL, NULL, 'Болдын Тэмүүлэн', '9Б', '99001122', NULL, 'new', 2)",
  );
  const db = drizzle(sqlite);
  const find = (q: string) =>
    db
      .select({ id: applications.id })
      .from(applications)
      .where(applicationWhere(parseApplicationFilters({ q })))
      .all()
      .map((r) => r.id);

  test("empty or 1-character query matches everything", () => {
    expect(find("")).toEqual(["a1", "a2"]);
    expect(find("а")).toEqual(["a1", "a2"]);
  });
  test("name: start of a word, Cyrillic in any case", () => {
    expect(find("анужин")).toEqual(["a1"]);
    expect(find("БАТЫН")).toEqual(["a1"]);
    expect(find("тэм")).toEqual(["a2"]);
    expect(find("Ганаа")).toEqual([]);
  });
  test("phone: 3+ digits, separators ignored", () => {
    expect(find("8811 2233")).toEqual(["a1"]);
    expect(find("2233")).toEqual(["a1"]);
    expect(find("9999")).toEqual([]);
  });
  test("e-mail prefix; missing e-mail never matches", () => {
    expect(find("ANUJIN@gmail")).toEqual(["a1"]);
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
});
