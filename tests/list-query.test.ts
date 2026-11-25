import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { caseVariants, pageParam, searchParam, wordPrefix } from "@/lib/admin/list-query";

const people = sqliteTable("people", { name: text("name").notNull(), email: text("email") });

function setup() {
  const sqlite = new Database(":memory:");
  sqlite.run("CREATE TABLE people (name TEXT NOT NULL, email TEXT)");
  sqlite.run("CREATE INDEX people_name_nocase ON people (name COLLATE NOCASE)");
  const rows: [string, string | null][] = [
    ["Батын Анужин", "anujin@gmail.com"],
    ["Clerk Admin", "boss@school.mn"],
    ["Solongo Orgil", "solongo@gmail.com"],
    ["100% хувь_тест", null],
  ];
  for (const [name, email] of rows) sqlite.run("INSERT INTO people VALUES (?, ?)", [name, email]);
  return drizzle(sqlite);
}

const find = (q: string) =>
  setup()
    .select({ name: people.name })
    .from(people)
    .where(wordPrefix([people.name, people.email], q))
    .all()
    .map((r) => r.name);

describe("admin list search (SQL)", () => {
  test("Cyrillic in any case, start of any word", () => {
    expect(find("анужин")).toEqual(["Батын Анужин"]);
    expect(find("АНУ")).toEqual(["Батын Анужин"]);
    expect(find("бат")).toEqual(["Батын Анужин"]);
  });
  test("Latin names and e-mail prefixes", () => {
    expect(find("orgil")).toEqual(["Solongo Orgil"]);
    expect(find("boss@")).toEqual(["Clerk Admin"]);
  });
  test("not a substring search, and % / _ are literal", () => {
    expect(find("ужин")).toEqual([]);
    expect(find("100%")).toEqual(["100% хувь_тест"]);
    expect(find("х_в")).toEqual([]);
  });
  test("case forms of a term", () => {
    expect(caseVariants("ану")).toEqual(["ану", "Ану", "АНУ"]);
  });
  test("parameters: 2+ characters, sane page numbers", () => {
    expect(searchParam({ q: "а" })).toBe("");
    expect(searchParam({ q: " ан " })).toBe("ан");
    expect(pageParam({ page: "3" })).toBe(3);
    expect(pageParam({ page: "-1" })).toBe(1);
    expect(pageParam({ page: "abc" })).toBe(1);
  });
});
