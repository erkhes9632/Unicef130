/** School years (1 Sep – 31 Aug, Ulaanbaatar time): the helper, its SQL forms, migration 0012. */
import { readdirSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { pickShownTeam } from "@/lib/members/logic";
import {
  currentSchoolYear,
  displayYear,
  groupByYear,
  isSchoolYear,
  nextSchoolYear,
  previousSchoolYear,
  schoolYearDays,
  schoolYearOf,
  schoolYearOfDay,
  schoolYearRange,
  sortYearsDesc,
} from "@/lib/school-year";
import { schoolYearDaySql, schoolYearSql } from "@/lib/school-year-sql";

const ub = (iso: string) => Date.parse(`${iso}+08:00`);

describe("schoolYearOf (Ulaanbaatar time)", () => {
  test("31 August is the old year, 1 September the new one", () => {
    expect(schoolYearOf(ub("2026-08-31T23:59:59.999"))).toBe("2025-2026");
    expect(schoolYearOf(ub("2026-09-01T00:00:00"))).toBe("2026-2027");
    expect(schoolYearOf(ub("2027-08-31T12:00:00"))).toBe("2026-2027");
    expect(schoolYearOf(ub("2027-09-01T00:00:00"))).toBe("2027-2028");
  });
  test("uses UB time, not UTC", () => {
    // 31 Aug 16:00 UTC = 1 Sep 00:00 in Ulaanbaatar.
    expect(schoolYearOf(Date.UTC(2026, 7, 31, 15, 59))).toBe("2025-2026");
    expect(schoolYearOf(Date.UTC(2026, 7, 31, 16, 0))).toBe("2026-2027");
  });
  test("mid-year dates and input types", () => {
    expect(schoolYearOf(new Date("2026-01-15T10:00:00Z"))).toBe("2025-2026");
    expect(schoolYearOf("2026-11-25T03:00:00.000Z")).toBe("2026-2027");
  });
  test("calendar days (album dates)", () => {
    expect(schoolYearOfDay("2026-08-31")).toBe("2025-2026");
    expect(schoolYearOfDay("2026-09-01")).toBe("2026-2027");
    expect(schoolYearOfDay("2027-01-01")).toBe("2026-2027");
  });
});

describe("school year helpers", () => {
  test("validation", () => {
    expect(isSchoolYear("2025-2026")).toBe(true);
    expect(isSchoolYear("2025-2027")).toBe(false);
    expect(isSchoolYear("2025–2026")).toBe(false);
    expect(isSchoolYear("")).toBe(false);
    expect(isSchoolYear(null)).toBe(false);
  });
  test("next / previous / display", () => {
    expect(nextSchoolYear("2025-2026")).toBe("2026-2027");
    expect(previousSchoolYear("2025-2026")).toBe("2024-2025");
    expect(displayYear("2026-2027")).toBe("2026–2027");
  });
  test("ranges: [1 Sep 00:00 UB, next 1 Sep 00:00 UB)", () => {
    const r = schoolYearRange("2026-2027");
    expect(r.from).toBe(ub("2026-09-01T00:00:00"));
    expect(r.to).toBe(ub("2027-09-01T00:00:00"));
    expect(schoolYearOf(r.from)).toBe("2026-2027");
    expect(schoolYearOf(r.to - 1)).toBe("2026-2027");
    expect(schoolYearOf(r.to)).toBe("2027-2028");
    expect(schoolYearDays("2026-2027")).toEqual({ from: "2026-09-01", to: "2027-09-01" });
  });
  test("current year: the admin's setting, else today's (2026-11-25 → 2026-2027)", () => {
    const today = ub("2026-11-25T12:00:00");
    expect(currentSchoolYear("", today)).toBe("2026-2027");
    expect(currentSchoolYear("bad", today)).toBe("2026-2027");
    expect(currentSchoolYear("2027-2028", ub("2027-08-28T12:00:00"))).toBe("2027-2028");
  });
  test("sorting and grouping, newest first", () => {
    expect(sortYearsDesc(["2025-2026", null, "2026-2027", "x", "2025-2026"])).toEqual([
      "2026-2027",
      "2025-2026",
    ]);
    const items = [
      { id: 1, y: "2026-2027" },
      { id: 2, y: "2026-2027" },
      { id: 3, y: "2025-2026" },
    ];
    expect(groupByYear(items, (i) => i.y).map((g) => [g.year, g.items.length])).toEqual([
      ["2026-2027", 2],
      ["2025-2026", 1],
    ]);
  });
});

describe("SQL forms match the helper", () => {
  const db = drizzle(new Database(":memory:"));
  const yearOfMs = (ms: number) =>
    db.all<{ y: string }>(sql`SELECT ${schoolYearSql(sql`${ms}`)} AS y`)[0]!.y;
  const yearOfDay = (d: string) =>
    db.all<{ y: string }>(sql`SELECT ${schoolYearDaySql(sql`${d}`)} AS y`)[0]!.y;

  test("timestamps around both boundaries", () => {
    for (const iso of [
      "2026-08-31T23:59:59.999",
      "2026-09-01T00:00:00",
      "2027-01-01T00:00:00",
      "2027-08-31T12:00:00",
      "2025-09-01T00:00:00",
    ])
      expect(yearOfMs(ub(iso)), iso).toBe(schoolYearOf(ub(iso)));
  });
  test("calendar days", () => {
    for (const d of ["2026-08-31", "2026-09-01", "2027-02-28"])
      expect(yearOfDay(d), d).toBe(schoolYearOfDay(d));
  });
});

describe("which team the public pages show", () => {
  const teams = [{ year: "2025-2026" }, { year: "2024-2025" }];
  test("the current year has no team yet → the latest year + a note, never empty", () => {
    expect(pickShownTeam(teams, "2026-2027")).toEqual({
      shown: { year: "2025-2026" },
      waiting: "2026-2027",
      earlier: [{ year: "2024-2025" }],
    });
  });
  test("the current year has a team → it is on top, older years below", () => {
    const withNew = [{ year: "2026-2027" }, ...teams];
    const r = pickShownTeam(withNew, "2026-2027");
    expect(r.shown).toEqual({ year: "2026-2027" });
    expect(r.waiting).toBeNull();
    expect(r.earlier.map((t) => t.year)).toEqual(["2025-2026", "2024-2025"]);
  });
  test("an earlier year's page; unknown year → nothing", () => {
    expect(pickShownTeam(teams, "2026-2027", "2024-2025").shown).toEqual({ year: "2024-2025" });
    expect(pickShownTeam(teams, "2026-2027", "2019-2020").shown).toBeNull();
    expect(pickShownTeam([], "2026-2027").shown).toBeNull();
  });
});

describe("migration 0012 (member_years backfill)", () => {
  const dir = "drizzle/migrations";
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
  const run = (sqlite: Database, file: string) => {
    for (const stmt of readFileSync(`${dir}/${file}`, "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) sqlite.run(stmt);
    }
  };

  test("every existing member ends up in 2025-2026 (5 leaders, 52 report members), nothing removed", () => {
    const sqlite = new Database(":memory:");
    for (const f of files.filter((f) => f < "0012")) run(sqlite, f);
    // Production shape (2026-11-27): 5 leaders (public), 52 report members, 1 account member
    // without a school year.
    const now = Date.parse("2026-11-20T00:00:00Z");
    sqlite.run(
      `INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('u1', 'a@x.mn', '', ${now}, ${now})`,
    );
    const add = (
      id: string,
      group: string,
      role: string,
      order: number,
      pub: number,
      year: string | null,
      user: string | null,
    ) =>
      sqlite.run(
        `INSERT INTO members (id, name, role, "group", sort_order, show_publicly, school_year, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`,
        [id, `N ${id}`, role, group, order, pub, year, user],
      );
    for (let i = 1; i <= 5; i++)
      add(`m26-lead-${i}`, "leadership", `Role ${i}`, i, 1, "2025-2026", null);
    for (let i = 1; i <= 52; i++)
      add(`m26-mem-${i}`, "member", "Гишүүн", 100 + i, 0, "2025-2026", null);
    add("site-1", "member", "Гишүүн", 500, 0, null, "u1");
    const before = sqlite.query("SELECT * FROM members ORDER BY id").all();

    run(
      sqlite,
      files.find((f) => f.startsWith("0012"))!,
    );
    const count = (where: string) =>
      (sqlite.query(`SELECT count(*) n FROM member_years WHERE ${where}`).get() as { n: number }).n;

    expect(count("1")).toBe(58);
    expect(count("school_year <> '2025-2026'")).toBe(0);
    expect(count("role = 'leadership'")).toBe(5);
    expect(count("role = 'member' AND member_id LIKE 'm26-mem-%'")).toBe(52);
    // Role, position, order and show_publicly carried over.
    expect(
      sqlite
        .query(
          "SELECT position, sort_order, show_publicly FROM member_years WHERE member_id = 'm26-lead-2'",
        )
        .get(),
    ).toEqual({ position: "Role 2", sort_order: 2, show_publicly: 1 });
    // Additions only: the members table is unchanged.
    expect(sqlite.query("SELECT * FROM members ORDER BY id").all()).toEqual(before);
    // Idempotent: the backfill again adds nothing.
    const backfill = readFileSync(`${dir}/${files.find((f) => f.startsWith("0012"))}`, "utf8")
      .split("--> statement-breakpoint")
      .at(-1)!;
    sqlite.run(backfill);
    expect(count("1")).toBe(58);
  });
});
