/**
 * Imports a yearly club report (private JSON, not in git) into D1: leadership + active members,
 * one news post + one past event per activity, impact numbers, and the related site settings.
 *
 *   bun run report:seed                          # writes private/seed-report-<year>.sql
 *   bun run report:seed -- --local               # …and runs it against the LOCAL D1
 *   bun run report:seed -- --file private/other.json
 *
 * Production: run the generated SQL yourself (see README):
 *   bunx wrangler d1 execute DB --remote --file private/seed-report-2025-2026.sql
 *
 * Idempotent: rows have deterministic ids. Members, posts and events use ON CONFLICT DO NOTHING
 * (admin edits, uploaded photos and consent toggles are kept on re-runs). Impact numbers and the
 * report's settings keys (club, stats, partners, page.about) are overwritten with the report values.
 * Privacy: members are imported with show_publicly = 0 (leadership = 1); hours are stored for the
 * aggregate only. No phone numbers exist in the input and none are written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";
import { normalizeSdgs } from "@/lib/sdg";
import { defaultAbout, SETTINGS_KEYS } from "@/lib/settings/types";
import { slugify } from "@/lib/slug";
import { insert, runLocalSql, sqlValue } from "./lib/sql";

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    file: { type: "string", default: "private/report-2025-2026.json" },
    local: { type: "boolean", default: false },
  },
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const direction = z.enum(["advocacy", "education", "fundraising"]);
const reportSchema = z.object({
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  club: z.object({ name: z.string(), nameEn: z.string(), program: z.string() }),
  leadership: z.array(
    z.object({
      role: z.string(),
      roleEn: z.string(),
      name: z.string(),
      nameEn: z.string(),
      className: z.string(),
    }),
  ),
  membership: z.object({ totalJoined: z.number().int(), active: z.number().int() }),
  activeMembers: z.array(
    z.object({
      n: z.number().int(),
      latin: z.string(),
      hours: z.number().int().min(0),
      mn: z.string(),
      review: z.boolean().optional(),
    }),
  ),
  partners: z.array(
    z.object({ name: z.string(), nameEn: z.string(), type: z.enum(["partner", "beneficiary"]) }),
  ),
  activities: z.array(
    z.object({
      n: z.number().int(),
      direction,
      title: z.string(),
      titleEn: z.string(),
      start: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
      end: z
        .string()
        .regex(/^\d{2}\/\d{2}\/\d{4}$/)
        .nullable(),
      text: z.string(),
      textEn: z.string(),
      inPerson: z.string(),
      inPersonEn: z.string().optional(),
      online: z.number().int().nullable(),
      donationMnt: z.number().int().nullable(),
      partners: z.array(z.string()),
      beneficiaries: z.array(z.string()),
      sdgs: z.array(z.number().int()),
      location: z.string(),
      locationEn: z.string(),
      note: z.string(),
    }),
  ),
  impactTotals: z.array(
    z.object({
      direction: z.enum(["advocacy", "education", "fundraising", "total"]),
      activities: z.number().int(),
      inPerson: z.number().int(),
      inPersonLabel: z.string(),
      online: z.number().int(),
      total: z.number().int(),
      donationMnt: z.number().int(),
    }),
  ),
  impactNotes: z.record(z.string(), z.string()),
});

const report = reportSchema.parse(JSON.parse(readFileSync(args.file!, "utf8")));
const year = report.schoolYear;
const yy = year.replace("-", "").slice(2, 4) + year.slice(7, 9); // "2526"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Report directions → site keys (news category / event direction). */
export const directionKey = {
  advocacy: "activity",
  education: "education",
  fundraising: "charity",
} as const;

/** "17/11/2025" → noon in Ulaanbaatar (date-only events never shift a day). */
export function ubNoon(ddmmyyyy: string) {
  const [d, m, y] = ddmmyyyy.split("/");
  return Date.parse(`${y}-${m}-${d}T12:00:00+08:00`);
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const compact = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}K+` : fmt(n));

/** "~500" → "ойролцоогоор 500", "50+" → "50 гаруй"; non-numbers are returned as written. */
function reachMn(v: string) {
  if (/^~\s*[\d,]+$/.test(v)) return `ойролцоогоор ${v.replace(/^~\s*/, "")}`;
  if (/^[\d,]+\+$/.test(v)) return `${v.slice(0, -1)} гаруй`;
  return v;
}
function reachEn(v: string) {
  if (/^~\s*[\d,]+$/.test(v)) return `about ${v.replace(/^~\s*/, "")}`;
  return v;
}
const isCount = (v: string) => /^[~\s\d,+]+$/.test(v);

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

function doc(paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}

const mnDirection = { advocacy: "Нөлөөлөл", education: "Боловсрол", fundraising: "Хандив" };
const enDirection = { advocacy: "advocacy", education: "education", fundraising: "fundraising" };
const MN_MONTH = (m: number) => `${m}-р сарын`;

function dateMn(start: string, end: string | null) {
  const [d1, m1, y1] = start.split("/").map(Number) as [number, number, number];
  if (!end) return `${y1} оны ${MN_MONTH(m1)} ${d1}-нд`;
  const [d2, m2] = end.split("/").map(Number) as [number, number, number];
  return `${y1} оны ${MN_MONTH(m1)} ${d1}-нээс ${MN_MONTH(m2)} ${d2} хүртэл`;
}
function dateEn(start: string, end: string | null) {
  const f = (s: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(ubNoon(s)),
    );
  return end ? `from ${f(start)} to ${f(end)}` : `on ${f(start)}`;
}

/**
 * Post/event body: only facts from the report. Paragraphs: what happened (report text, split in
 * two when long), when and in which direction, and the reach/fundraising numbers.
 */
export function buildBody(a: (typeof report.activities)[number]) {
  const s = sentences(a.text);
  const se = sentences(a.textEn);
  const mn: string[] =
    s.length > 2 ? [s.slice(0, 2).join(" "), s.slice(2).join(" ")] : [s.join(" ")];
  const en: string[] =
    se.length > 2 ? [se.slice(0, 2).join(" "), se.slice(2).join(" ")] : [se.join(" ")];

  mn.push(
    `Энэ үйл ажиллагаа ${dateMn(a.start, a.end)} клубын «${mnDirection[a.direction]}» чиглэлийн хүрээнд болсон.`,
  );
  en.push(
    `This activity took place ${dateEn(a.start, a.end)} as part of the club's ${enDirection[a.direction]} work.`,
  );

  const reachMnParts: string[] = [];
  const reachEnParts: string[] = [];
  if (a.inPerson) {
    if (isCount(a.inPerson)) {
      reachMnParts.push(`биечлэн ${reachMn(a.inPerson)} хүнд`);
      reachEnParts.push(`${reachEn(a.inPerson)} people in person`);
    } else {
      reachMnParts.push(`биечлэн ${a.inPerson.toLocaleLowerCase("mn")}д`);
      reachEnParts.push(`the ${(a.inPersonEn ?? a.inPerson).toLowerCase()} in person`);
    }
  }
  if (a.online && a.online > 0) {
    reachMnParts.push(`онлайнаар ${fmt(a.online)} хүнд`);
    reachEnParts.push(`${fmt(a.online)} people online`);
  }
  const extraMn: string[] = [];
  const extraEn: string[] = [];
  if (reachMnParts.length) {
    extraMn.push(`Тайлангаар ${reachMnParts.join(", ")} хүрсэн.`);
    extraEn.push(`According to the report, it reached ${reachEnParts.join(" and ")}.`);
  }
  if (a.donationMnt) {
    extraMn.push(`Цуглуулсан хандив: ${fmt(a.donationMnt)}₮.`);
    extraEn.push(`Funds raised: ${fmt(a.donationMnt)}₮.`);
  }
  if (extraMn.length) {
    mn.push(extraMn.join(" "));
    en.push(extraEn.join(" "));
  }
  return { mn, en, summaryMn: s[0]!, summaryEn: se[0]! };
}

// ---------------------------------------------------------------------------
// Checks (the report's own arithmetic)
// ---------------------------------------------------------------------------

const hoursTotal = report.activeMembers.reduce((sum, m) => sum + m.hours, 0);
const totals = report.impactTotals.find((r) => r.direction === "total")!;
const dirRows = report.impactTotals.filter((r) => r.direction !== "total");
const problems: string[] = [];
if (report.activeMembers.length !== report.membership.active)
  problems.push(
    `active members listed ${report.activeMembers.length} ≠ ${report.membership.active}`,
  );
for (const k of ["inPerson", "online", "total", "donationMnt", "activities"] as const) {
  const sum = dirRows.reduce((s, r) => s + r[k], 0);
  if (sum !== totals[k]) problems.push(`impact ${k}: directions sum ${sum} ≠ total ${totals[k]}`);
}
for (const r of report.impactTotals)
  if (r.inPerson + r.online !== r.total)
    problems.push(`impact ${r.direction}: in person + online ≠ total`);
if (report.activities.length !== totals.activities)
  console.warn(
    `⚠️  Report total says ${totals.activities} activities, ${report.activities.length} are listed (imported as listed).`,
  );
if (problems.length) {
  console.error("✘ Report arithmetic does not add up:\n  " + problems.join("\n  "));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const now = Date.now();
const out: string[] = [
  `-- Generated by scripts/seed-report.ts from ${args.file} (${year}). Safe to run more than once.`,
];
const insertIgnore = (table: string, row: Record<string, unknown>) =>
  insert(table, row as never).replace(/^INSERT INTO/, "INSERT OR IGNORE INTO");
const upsertSetting = (key: string, value: unknown) =>
  `INSERT INTO "settings" ("key", "value", "updated_at") VALUES (${sqlValue(key)}, ${sqlValue(JSON.stringify(value))}, ${now}) ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updated_at" = excluded."updated_at";`;

// Members
report.leadership.forEach((l, i) => {
  out.push(
    insertIgnore("members", {
      id: `m${yy}-lead-${i + 1}`,
      name: l.name,
      name_en: l.nameEn,
      role: l.role,
      role_en: l.roleEn,
      class_name: l.className,
      group: "leadership",
      show_photo: false,
      sort_order: i + 1,
      active: true,
      show_publicly: true,
      school_year: year,
      created_at: now,
      updated_at: now,
    }),
  );
});
for (const m of report.activeMembers) {
  const [given, family = ""] = m.latin.split(/\s+/);
  out.push(
    insertIgnore("members", {
      id: `m${yy}-mem-${String(m.n).padStart(2, "0")}`,
      name: m.mn,
      name_en: family ? `${family[0]}. ${given}` : given,
      role: "Гишүүн",
      role_en: "Member",
      class_name: "",
      group: "member",
      show_photo: false,
      sort_order: 100 + m.n,
      active: true,
      show_publicly: false,
      volunteer_hours: m.hours,
      school_year: year,
      created_at: now,
      updated_at: now,
    }),
  );
}

// Events + news (one each per activity, linked)
for (const a of report.activities) {
  const nn = String(a.n).padStart(2, "0");
  const startYear = a.start.slice(6);
  const slug = `${slugify(a.title)}-${startYear}`;
  const body = buildBody(a);
  const sdgs = normalizeSdgs(a.sdgs);
  const key = directionKey[a.direction];
  const eventId = `e${yy}-${nn}`;
  out.push(
    insertIgnore("events", {
      id: eventId,
      slug,
      title: a.title,
      title_en: a.titleEn,
      summary: body.summaryMn,
      summary_en: body.summaryEn,
      content: doc(body.mn),
      content_en: doc(body.en),
      cover_url: null,
      location: a.location,
      location_en: a.locationEn || null,
      starts_at: ubNoon(a.start),
      ends_at: a.end ? ubNoon(a.end) : null,
      all_day: true,
      published: true,
      direction: key,
      school_year: year,
      reach_in_person: a.inPerson || null,
      reach_in_person_en: a.inPersonEn ?? (a.inPerson ? reachEn(a.inPerson) : null),
      reach_online: a.online,
      donation_amount: a.donationMnt,
      partners: a.partners,
      beneficiaries: a.beneficiaries,
      sdgs,
      admin_note: a.note,
      created_at: now,
      updated_at: now,
    }),
    insertIgnore("news", {
      id: `n${yy}-${nn}`,
      slug,
      title: a.title,
      title_en: a.titleEn,
      excerpt: body.summaryMn,
      excerpt_en: body.summaryEn,
      content: doc(body.mn),
      content_en: doc(body.en),
      cover_url: null,
      category: key,
      tags: [],
      status: "published",
      published_at: ubNoon(a.end ?? a.start),
      sdgs,
      event_id: eventId,
      created_at: now,
      updated_at: now,
    }),
  );
}

// Impact numbers (official report values; overwritten on re-run)
const impactDir = { ...directionKey, total: "total" } as const;
const noteKey = {
  advocacy: "advocacy",
  education: "education",
  fundraising: "fundraising",
  total: "total",
};
for (const r of report.impactTotals) {
  out.push(
    `INSERT INTO "impact_stats" ("id", "school_year", "direction", "activities", "in_person", "in_person_label", "online", "total", "donation_amount", "notes", "created_at", "updated_at") VALUES (${sqlValue(`i${yy}-${impactDir[r.direction]}`)}, ${sqlValue(year)}, ${sqlValue(impactDir[r.direction])}, ${r.activities}, ${r.inPerson}, ${sqlValue(r.inPersonLabel)}, ${r.online}, ${r.total}, ${r.donationMnt}, ${sqlValue(report.impactNotes[noteKey[r.direction]] ?? "")}, ${now}, ${now}) ON CONFLICT("school_year", "direction") DO UPDATE SET "activities" = excluded."activities", "in_person" = excluded."in_person", "in_person_label" = excluded."in_person_label", "online" = excluded."online", "total" = excluded."total", "donation_amount" = excluded."donation_amount", "notes" = excluded."notes", "updated_at" = excluded."updated_at";`,
  );
}

// Settings
const [y1, y2] = year.split("-");
out.push(
  upsertSetting(SETTINGS_KEYS.club, {
    name: report.club.name,
    nameEn: report.club.nameEn,
    description: `UNICEF Club Mongolia сүлжээний ${y1}–${y2} оны хөтөлбөрт хамрагддаг ${report.club.name}.`,
    descriptionEn: `The ${report.club.nameEn}, part of the UNICEF Club Mongolia ${y1}–${y2} programme.`,
    foundedYear: Number(y1),
  }),
  upsertSetting(SETTINGS_KEYS.stats, [
    {
      kind: "custom",
      label: "Нийт элссэн гишүүн",
      labelEn: "Members joined",
      value: fmt(report.membership.totalJoined),
    },
    {
      kind: "custom",
      label: "Идэвхтэй гишүүн (сертификаттай)",
      labelEn: "Active members (certified)",
      value: fmt(report.membership.active),
    },
    { kind: "custom", label: "Сайн дурын цаг", labelEn: "Volunteer hours", value: fmt(hoursTotal) },
    {
      kind: "custom",
      label: "Биечлэн хүрсэн хүн",
      labelEn: "People reached in person",
      value: fmt(totals.inPerson),
    },
    {
      kind: "custom",
      label: "Онлайнаар хүрсэн",
      labelEn: "People reached online",
      value: compact(totals.online),
    },
    {
      kind: "custom",
      label: "Хандиваар цуглуулсан",
      labelEn: "Funds raised",
      value: `${fmt(totals.donationMnt)}₮`,
    },
    {
      kind: "events",
      label: "Зохион байгуулсан үйл ажиллагаа",
      labelEn: "Activities organised",
      value: "",
    },
  ]),
  upsertSetting(
    SETTINGS_KEYS.partners,
    report.partners.map((p) => ({
      name: p.name,
      nameEn: p.nameEn,
      logoUrl: "",
      url: "",
      type: p.type,
    })),
  ),
  upsertSetting(SETTINGS_KEYS.about, {
    ...defaultAbout,
    intro: `${report.club.name} нь ${y1}–${y2} оны хичээлийн жилд UNICEF Club Mongolia сүлжээний нэг хэсэг болж байгуулагдсан сурагчдын клуб юм.`,
    introEn: `The ${report.club.nameEn} is a student club founded in the ${y1}–${y2} school year as part of the UNICEF Club Mongolia network.`,
    history: [
      "Клубын анхны уулзалт 2025 оны 11-р сарын 11-нд болж, 50 орчим гишүүн оролцсон. Уулзалтаар клубын зорилго, жилийн төлөвлөгөө болон UNICEF-ийн үндсэн үнэт зүйлсийг танилцуулсан.",
      "2025 оны 11-р сарын 21 гэхэд клуб бараг 100 гишүүнтэй болсон. Бүх гишүүнийг идэвхтэй оролцуулахын тулд гишүүдийг 6 багт хувааж, хичээлийн жил дуустал хамтран ажиллахаар зохион байгуулж, багийн уур амьсгалыг бүрдүүлэх үйл ажиллагаа хийсэн.",
      `Хичээлийн жилийн туршид клубт нийт ${report.membership.totalJoined} сурагч элсэж, тэдний ${report.membership.active} нь идэвхтэй гишүүнээр UNICEF Club Mongolia-ийн сертификат авсан.`,
      "Клуб нөлөөлөл, боловсрол, хандив гэсэн гурван чиглэлээр үйл ажиллагаа явуулдаг.",
    ].join("\n\n"),
    historyEn: [
      "The club's first meeting took place on 11 November 2025 with about 50 members. At the meeting we introduced the club's goals, the yearly plan and UNICEF's core values.",
      "By 21 November 2025 the club had almost 100 members. To involve everyone actively, the members were divided into 6 teams that would work together until the end of the school year, and we organised team-building activities.",
      `During the school year, ${report.membership.totalJoined} students joined the club in total, and ${report.membership.active} of them earned UNICEF Club Mongolia certificates as active members.`,
      "The club works in three directions: advocacy, education and fundraising.",
    ].join("\n\n"),
    historyPublished: true,
  }),
);

const sqlFile = `private/seed-report-${year}.sql`;
writeFileSync(sqlFile, out.join("\n") + "\n");
console.log(
  `✅ ${sqlFile}: ${report.leadership.length} leaders, ${report.activeMembers.length} members (hidden), ${report.activities.length} posts + events, impact ${year}. Volunteer hours total: ${hoursTotal}.`,
);
const toReview = report.activeMembers.filter((m) => m.review).map((m) => `#${m.n} ${m.mn}`);
if (toReview.length)
  console.log(`ℹ️  Names to double-check before publishing: ${toReview.join(", ")}`);

if (args.local) {
  await runLocalSql(out.slice(1), `seed-report-${year}`);
  console.log("✅ Applied to LOCAL D1.");
}
