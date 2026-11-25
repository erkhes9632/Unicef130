/**
 * Yearly report import pipeline (scripts/report): pure parts, on a small made-up fixture
 * (no real names). The real data is checked in report.test.ts when private/ exists.
 */
import { readdirSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { parseDocumentXml, parseRels } from "../scripts/report/docx";
import {
  buildImport,
  matchMemberNames,
  reachLabels,
  splitText,
  statItems,
} from "../scripts/report/lib";
import type { Manifest, Report } from "../scripts/report/types";

const report: Report = {
  schoolYear: "2025-2026",
  contentVersion: "2026-11-21",
  source: { file: "x.docx", sha256: "0" },
  club: {
    school: "130-р сургууль",
    schoolEn: "School No. 130",
    name: "130-р сургуулийн UNICEF клуб",
    nameEn: "UNICEF Club of School No. 130",
    foundedYear: 2025,
  },
  leaders: [{ role: "Ахлагч", roleEn: "Club leader", name: "Test Leader" }],
  membership: { totalJoined: 3, active: 2, hours: 7 },
  activeMembers: [
    { n: 1, name: "Тест Нэг", nameEn: "Test One", hours: 3 },
    { n: 2, name: "Test Two", nameEn: "Test Two", hours: 4 },
  ],
  organisations: [{ name: "Partner", nameEn: "Partner", type: "partner" }],
  activities: [1, 2].map((n) => ({
    n,
    pillar: "advocacy" as const,
    slug: `test-activity-${n}-2025`,
    title: `Тест ${n}`,
    titleEn: `Test ${n}`,
    start: "2025-11-17",
    end: n === 1 ? "2025-12-19" : null,
    text: "Нэгдүгээр өгүүлбэр. Хоёр. Гурав. Дөрөв.",
    textEn: "First sentence. Two. Three. Four.",
    inPerson: { value: 500, approx: true, atLeast: false, label: "≈500", labelEn: "≈500" },
    online: 10,
    raised: null,
    sdgs: [1],
    partners: ["Partner"],
    beneficiaries: [],
    location: "",
    locationEn: "",
    note: "",
  })),
  totals: [
    {
      pillar: "advocacy",
      activities: 2,
      inPerson: 1000,
      inPersonLabel: "1,000",
      online: 22,
      total: 1022,
      raised: 0,
    },
    {
      pillar: "total",
      activities: 2,
      inPerson: 1000,
      inPersonLabel: "1,000",
      online: 22,
      total: 1022,
      raised: 0,
    },
  ],
  discrepancies: ["advocacy: online rows add up to 20, the official total is 22 (difference 2)."],
};

const out = (key: string) => ({
  key,
  thumbKey: key.replace(".webp", "-thumb.webp"),
  file: `private/${key}`,
  thumbFile: `private/${key}`.replace(".webp", "-thumb.webp"),
  width: 1600,
  height: 1200,
  thumbWidth: 480,
  thumbHeight: 360,
  md5: "a",
  thumbMd5: "b",
  mediumKey: key.replace(".webp", "-md.webp"),
  mediumFile: `private/${key}`.replace(".webp", "-md.webp"),
  mediumMd5: "c",
});
const manifest: Manifest = {
  source: "x.docx",
  images: [1, 2].map((order) => ({
    file: `image${order}.jpg`,
    sha256: String(order),
    width: 2000,
    height: 1500,
    where: "activity #1",
    activity: 1,
    order,
    duplicateOf: null,
    keep: true,
    reason: "",
    alt: "Гишүүд мод тарьж байна",
    altEn: "Members planting a tree",
    original: null,
    output: out(`content/2025-2026/test-activity-1-2025/0${order}.webp`),
  })),
};

/** Local D1 schema from the migrations (bun:sqlite), with foreign keys on like D1. */
function freshDb() {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const f of readdirSync("drizzle/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort())
    for (const stmt of readFileSync(`drizzle/migrations/${f}`, "utf8").split(
      "--> statement-breakpoint",
    ))
      if (stmt.trim()) db.exec(stmt);
  return db;
}
const apply = (db: Database, statements: string[]) => db.exec(statements.join("\n"));
const dump = (db: Database) =>
  JSON.stringify(
    [
      "news",
      "events",
      "albums",
      "images",
      "members",
      "impact_stats",
      "slug_redirects",
      "settings",
    ].map((t) => db.query(`SELECT * FROM "${t}" ORDER BY 1`).all()),
  );

describe("report import helpers", () => {
  test("reach labels keep ≈ / + as flags and text as written", () => {
    expect(reachLabels({ value: 500, approx: true })).toEqual({ label: "≈500", labelEn: "≈500" });
    expect(reachLabels({ value: 150, atLeast: true }).label).toBe("150+");
    expect(reachLabels({ value: 1000 }).label).toBe("1,000");
    expect(
      reachLabels({ value: null, text: "Сургуулийн хүрээлэл", textEn: "School community" }),
    ).toEqual({ label: "Сургуулийн хүрээлэл", labelEn: "School community" });
  });

  test("lead sentence is split from the body", () => {
    const { lead, body } = splitText("A one. B two. C three.");
    expect(lead).toBe("A one.");
    expect(body.content).toHaveLength(1);
    expect(splitText("Only one.").body.content).toHaveLength(0);
  });

  test("stats come from the report numbers", () => {
    const s = statItems(report);
    expect(s.map((x) => x.value)).toEqual(["3", "2", "7", "1,000", "22", "0₮", ""]);
    expect(s.filter((x) => x.featured).length).toBeLessThanOrEqual(5);
  });

  test("member names: previous Cyrillic only on a clear match", () => {
    const rows = [
      { n: 1, latin: "Anu Bold", hours: 5 },
      { n: 2, latin: "Saran Dorj", hours: 8 },
      { n: 3, latin: "Tuya Gan", hours: 2 },
      { n: 4, latin: "Nomin Bat", hours: 3 },
    ];
    const known = [
      { n: 1, mn: "Ану", nameEn: "B. Anu", hours: 5, review: false },
      { n: 2, mn: "Саран", nameEn: "D. Saran", hours: 9, review: false }, // hours differ
      { n: 4, mn: "Номин", nameEn: "B. Nomin", hours: 3, review: true }, // uncertain spelling
    ];
    const { members, review } = matchMemberNames(rows, known);
    expect(members.map((m) => m.name)).toEqual(["Ану", "Saran Dorj", "Tuya Gan", "Номин"]);
    expect(members.every((m, i) => m.nameEn === rows[i]!.latin)).toBe(true);
    expect(review.map((r) => r.n)).toEqual([2, 3, 4]);
  });

  test("docx tokenizer keeps tables, cells and images", () => {
    const xml =
      '<w:document><w:body><w:p><w:r><w:t>Title</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t xml:space="preserve">A &amp; B</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><a:blip r:embed="rId9"/></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    const blocks = parseDocumentXml(xml);
    expect(blocks[0]).toEqual({ kind: "p", text: "Title", images: [] });
    expect(blocks[1]).toEqual({
      kind: "table",
      table: {
        index: 0,
        rows: [
          [
            { lines: ["A & B"], images: [] },
            { lines: [], images: ["rId9"] },
          ],
        ],
      },
    });
    expect(
      parseRels('<Relationship Id="rId9" Type="x" Target="media/image4.jpg"/>').get("rId9"),
    ).toBe("word/media/image4.jpg");
  });
});

describe("report import SQL", () => {
  const { statements, uploads } = buildImport(report, manifest);
  const sql = statements.join("\n");

  test("never deletes from the tables that hold accounts, applications or logs", () => {
    for (const t of [
      "users",
      "applications",
      "recruitment_periods",
      "event_signups",
      "volunteer_hours",
      "activity_log",
      "rate_limit",
      "contact_messages",
      "faqs",
      "settings",
    ])
      expect(sql).not.toMatch(new RegExp(`DELETE FROM "${t}"`));
    expect(sql).not.toMatch(/INSERT OR REPLACE|REPLACE INTO|DROP /);
  });

  test("cover = first photo, album only when there are more, uploads listed", () => {
    expect(sql).toContain("/media/content/2025-2026/test-activity-1-2025/01.webp");
    expect(uploads).toHaveLength(6); // 2 photos × full, medium, thumb
    expect(uploads.every((u) => u.key.startsWith("content/"))).toBe(true);
  });

  test("runs on the real schema, keeps user data, and a second run changes nothing", () => {
    const db = freshDb();
    db.exec(`
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('u1', 'a@example.test', 'A', 1, 1);
      INSERT INTO members (id, name, "group", user_id, created_at, updated_at) VALUES ('linked', 'A', 'member', 'u1', 1, 1);
      INSERT INTO members (id, name, "group", created_at, updated_at) VALUES ('sample', 'Sample', 'member', 1, 1);
      INSERT INTO events (id, slug, title, content, starts_at, created_at, updated_at) VALUES ('ev', 'ev', 'Ev', '{}', 1, 1, 1);
      INSERT INTO event_signups (id, event_id, user_id, created_at, updated_at) VALUES ('s1', 'ev', 'u1', 1, 1);
      INSERT INTO events (id, slug, title, content, starts_at, created_at, updated_at) VALUES ('old', 'old', 'Old', '{}', 1, 1, 1);
      INSERT INTO settings (key, value, updated_at) VALUES ('branding', '{"schoolLogoUrl":"/media/site/x.webp"}', 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      INSERT INTO settings (key, value, updated_at) VALUES ('page.about', '{"mission":"Keep me","intro":"old"}', 1);
    `);
    apply(db, statements);
    const first = dump(db);
    const ids = (t: string) =>
      db
        .query(`SELECT id FROM "${t}" ORDER BY id`)
        .all()
        .map((r) => (r as { id: string }).id);
    expect(ids("members")).toEqual(["linked", "m2526-lead-1", "m2526-mem-01", "m2526-mem-02"]);
    expect(ids("events")).toEqual(["e2526-01", "e2526-02", "ev"]);
    expect(ids("event_signups")).toEqual(["s1"]);
    expect(ids("users")).toEqual(["u1"]);
    expect(ids("images")).toHaveLength(2);
    const setting = (k: string) =>
      JSON.parse(
        (db.query("SELECT value FROM settings WHERE key = ?").get(k) as { value: string }).value,
      );
    expect(setting("branding").schoolLogoUrl).toBe("/media/site/x.webp");
    expect(setting("page.about")).toMatchObject({ mission: "Keep me", historyPublished: true });
    expect(setting("page.about").intro).toContain("2025");
    expect(db.query("SELECT alt, alt_en FROM images ORDER BY id LIMIT 1").get()).toEqual({
      alt: "Гишүүд мод тарьж байна",
      alt_en: "Members planting a tree",
    });
    expect(db.query("SELECT name, name_en FROM members WHERE id = 'm2526-mem-01'").get()).toEqual({
      name: "Тест Нэг",
      name_en: "Test One",
    });
    const leader = db
      .query("SELECT show_publicly, active FROM members WHERE id = 'm2526-lead-1'")
      .get();
    expect(leader).toEqual({ show_publicly: 0, active: 1 });
    const news = db.query("SELECT cover_url, album_id FROM news ORDER BY id").all();
    expect(news).toEqual([
      { cover_url: "/media/content/2025-2026/test-activity-1-2025/01.webp", album_id: "a2526-01" },
      { cover_url: null, album_id: null },
    ]);

    apply(db, statements);
    expect(dump(db)).toBe(first);
  });
});
