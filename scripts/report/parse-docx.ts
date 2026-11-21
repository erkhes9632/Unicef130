/**
 * Step 1 of the yearly report import: reads the original report (.docx) and writes
 *   private/report-<year>.json            clean data (no phone numbers; names stay private)
 *   private/report-media/manifest.json    every image: where it sits, hash, keep/skip + why
 *   private/report-media/originals/*      the original image files (private)
 *   private/report-media/web/<slug>/*     kept photos as WebP (1600 px + 480 px thumb, no EXIF)
 *
 *   bun scripts/report/parse-docx.ts [--docx private/report-2025-2026.docx]
 *
 * Numbers, dates and SDGs come from the curated table (content-<year>.ts) and are checked against
 * the .docx: every difference is printed and stored in `discrepancies`. Descriptions come from
 * the .docx (typo fixes only). Every image must have a decision in PHOTO_REVIEW (looked at by
 * eye); an unknown image stops the script. Output is deterministic (same input → same bytes).
 * Logs contain counts only, never names.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { parseSdgList } from "@/lib/sdg";
import { slugify } from "@/lib/slug";
import {
  ACTIVITIES,
  CLUB,
  CONTENT_VERSION,
  LEADER_ROLES,
  MEMBERSHIP,
  ORGANISATIONS,
  PHOTO_REVIEW,
  SCHOOL_YEAR,
  TEXT_FIXES,
  TOTALS,
  type CuratedActivity,
} from "./content-2025-2026";
import { blipIds, parseDocumentXml, parseRels, readZip, type Row, type Table } from "./docx";
import { reachLabels, sumBy } from "./lib";
import type { Manifest, Report } from "./types";

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: { docx: { type: "string", default: `private/report-${SCHOOL_YEAR}.docx` } },
});
const DOCX = args.docx!;
const OUT_JSON = `private/report-${SCHOOL_YEAR}.json`;
const MEDIA_DIR = "private/report-media";
const FULL_EDGE = 1600;
const THUMB_EDGE = 480;
const WEBP_QUALITY = 80;

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const md5 = (b: Uint8Array) => createHash("md5").update(b).digest("hex");
const fixText = (s: string) => TEXT_FIXES.reduce((t, [re, to]) => t.replace(re, to), s).trim();
const cellText = (row: Row, i: number) => (row[i]?.lines ?? []).join(" ").trim();
/** Leader cells hold "Name /phone/": the phone number is dropped here and never stored. */
const withoutPhone = (s: string) => s.replace(/\/?\s*\+?\d[\d\s-]{5,}\d\s*\/?/g, "").trim();
const issues: string[] = [];

// ---------------------------------------------------------------------------
// Read the document
// ---------------------------------------------------------------------------

const docxBytes = new Uint8Array(readFileSync(DOCX));
const zip = readZip(docxBytes);
const xml = (path: string) => new TextDecoder().decode(zip.get(path) ?? new Uint8Array());
const blocks = parseDocumentXml(xml("word/document.xml"));
const rels = parseRels(xml("word/_rels/document.xml.rels"));
const tables = blocks.flatMap((b) => (b.kind === "table" ? [b.table] : []));

function findTable(test: (t: Table) => boolean, what: string) {
  const t = tables.find(test);
  if (!t) throw new Error(`Report table not found: ${what}`);
  return t;
}
const firstCell = (t: Table) => cellText(t.rows[0] ?? [], 0);

const clubTable = findTable((t) => firstCell(t) === "Сургуулийн нэр", "club");
const leaderTable = findTable((t) => firstCell(t) === "Ахлагч", "leaders");
const joinTable = findTable((t) => firstCell(t) === "Нийт элссэн гишүүд", "membership");
const memberTable = findTable((t) => cellText(t.rows[0] ?? [], 1).includes("нэрс"), "members");
const activityTable = findTable(
  (t) => cellText(t.rows[0] ?? [], 1) === "Үйл ажиллагааны нэр",
  "activities",
);
const totalsTable = findTable(
  (t) => /Зохион байгуулсан/.test(cellText(t.rows[0] ?? [], 1)),
  "totals",
);

// ---------------------------------------------------------------------------
// Club, leaders, members
// ---------------------------------------------------------------------------

const docSchool = cellText(clubTable.rows[0]!, 1);
const docClub = cellText(clubTable.rows[1]!, 1);
if (docSchool !== CLUB.school) issues.push(`School name in the .docx: «${docSchool}»`);
if (docClub.replace(/club$/i, "клуб") !== CLUB.name)
  issues.push(`Club name in the .docx is «${docClub}» (site uses «${CLUB.name}»)`);

const leaders = leaderTable.rows.map((row, i) => {
  const role = cellText(row, 0);
  const expected = LEADER_ROLES[i];
  if (!expected || expected.role !== role)
    throw new Error(`Leader row ${i + 1}: unexpected role in the .docx`);
  return { role, roleEn: expected.roleEn, name: withoutPhone(cellText(row, 1)) };
});

const joined = Number(cellText(joinTable.rows[0]!, 1));
const active = Number(cellText(joinTable.rows[0]!, 3));
if (joined !== MEMBERSHIP.totalJoined) issues.push(`Total joined in the .docx: ${joined}`);
if (active !== MEMBERSHIP.active) issues.push(`Active members in the .docx: ${active}`);

const activeMembers = memberTable.rows.slice(1).map((row) => ({
  n: Number(cellText(row, 0)),
  name: cellText(row, 1),
  hours: Number(cellText(row, 2)),
}));
for (const m of activeMembers)
  if (!Number.isInteger(m.n) || !m.name || !Number.isInteger(m.hours))
    throw new Error(`Active member row #${m.n}: could not read the row`);
const hoursSum = sumBy(activeMembers, (m) => m.hours);
if (activeMembers.length !== MEMBERSHIP.active)
  issues.push(`Active member list has ${activeMembers.length} rows, the report says ${active}`);
if (hoursSum !== MEMBERSHIP.hours)
  issues.push(
    `Volunteer hours: the ${activeMembers.length} rows add up to ${hoursSum}, not ${MEMBERSHIP.hours} (stored: ${hoursSum})`,
  );

// ---------------------------------------------------------------------------
// Activities (table 4): section rows switch the pillar, header rows switch the column layout
// ---------------------------------------------------------------------------

type Parsed = {
  n: number;
  pillar: CuratedActivity["pillar"];
  title: string;
  dates: string;
  text: string;
  images: string[];
  inPerson: string;
  online: string;
  raised: string;
  sdg: string;
};
const parsed: Parsed[] = [];
let pillar: CuratedActivity["pillar"] | null = null;
let layout: "standard" | "fundraising" = "standard";
for (const row of activityTable.rows) {
  const c0 = cellText(row, 0);
  if (/^\d+$/.test(c0)) {
    if (!pillar) throw new Error(`Activity #${c0} before any section row`);
    const dateAndText = row[2]?.lines ?? [];
    const cols = layout === "fundraising" ? [4, 6, 5, 7] : [4, 5, -1, 6];
    parsed.push({
      n: Number(c0),
      pillar,
      title: fixText(cellText(row, 1)),
      dates: dateAndText[0] ?? "",
      text: fixText(dateAndText.slice(1).join(" ")),
      images: row.flatMap((c) => c.images),
      inPerson: cellText(row, cols[0]!),
      online: cellText(row, cols[1]!),
      raised: cols[2]! >= 0 ? cellText(row, cols[2]!) : "",
      sdg: fixText(row[cols[3]!]?.lines.join(", ") ?? ""),
    });
  } else if (/олсон хандив/.test(row.map((c) => c.lines.join(" ")).join("|"))) {
    layout = "fundraising";
  } else if (/^Нөлөөлл/.test(c0)) pillar = "advocacy";
  else if (/^Боловсрол/.test(c0)) pillar = "education";
  else if (/^Хандив/.test(c0)) pillar = "fundraising";
}

/** "2,193" → 2193 · "ойролцоогоор 500" → 500 · "50+" → 50 · "700,000MNT" → 700000 · text → null */
function readNumber(raw: string) {
  const m = /(\d[\d,]*)/.exec(raw);
  return m ? Number(m[1]!.replace(/,/g, "")) : null;
}
/** "17/11/2025-19/12/2025" → ["2025-11-17", "2025-12-19"] */
function readDates(raw: string) {
  return [...raw.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`);
}

const activities: Report["activities"] = ACTIVITIES.map((c) => {
  const p = parsed.find((x) => x.n === c.n);
  if (!p) throw new Error(`Activity #${c.n} not found in the .docx`);
  const diff = (what: string, doc: unknown, used: unknown) => {
    if (JSON.stringify(doc) !== JSON.stringify(used))
      issues.push(`#${c.n} ${what}: .docx ${JSON.stringify(doc)} → used ${JSON.stringify(used)}`);
  };
  diff("pillar", p.pillar, c.pillar);
  diff("title", p.title, c.title);
  diff("dates", readDates(p.dates), c.end ? [c.start, c.end] : [c.start]);
  diff("in person", readNumber(p.inPerson), c.inPerson.value);
  diff("online", readNumber(p.online), c.online);
  diff("raised", readNumber(p.raised), c.raised);
  diff(
    "SDGs",
    parseSdgList(p.sdg),
    [...c.sdgs].sort((a, b) => a - b),
  );
  if (!p.text) throw new Error(`Activity #${c.n}: no description in the .docx`);
  const labels = reachLabels(c.inPerson);
  return {
    n: c.n,
    pillar: c.pillar,
    slug: `${slugify(c.title)}-${c.start.slice(0, 4)}`,
    title: c.title,
    titleEn: c.titleEn,
    start: c.start,
    end: c.end,
    text: p.text,
    textEn: c.textEn,
    inPerson: {
      value: c.inPerson.value,
      approx: !!c.inPerson.approx,
      atLeast: !!c.inPerson.atLeast,
      ...labels,
    },
    online: c.online,
    raised: c.raised,
    sdgs: c.sdgs,
    partners: c.partners,
    beneficiaries: c.beneficiaries,
    location: c.location,
    locationEn: c.locationEn,
    note: c.note,
  };
});
if (parsed.length !== ACTIVITIES.length)
  issues.push(`.docx lists ${parsed.length} activities, curated ${ACTIVITIES.length}`);

// ---------------------------------------------------------------------------
// Official totals (section 5) and the report's own arithmetic
// ---------------------------------------------------------------------------

const pillarOf: Record<string, (typeof TOTALS)[number]["pillar"]> = {
  Нөлөөлөл: "advocacy",
  Боловсрол: "education",
  Хандив: "fundraising",
  Нийт: "total",
};
for (const row of totalsTable.rows) {
  const key = pillarOf[cellText(row, 0)];
  const official = TOTALS.find((t) => t.pillar === key);
  if (!official) continue;
  const doc = [2, 4, 6, 8, 10].map((i) => readNumber(cellText(row, i)));
  const used = [
    official.activities,
    official.inPerson,
    official.online,
    official.total,
    official.raised,
  ];
  if (JSON.stringify(doc) !== JSON.stringify(used))
    issues.push(`Totals ${key}: .docx ${JSON.stringify(doc)} → used ${JSON.stringify(used)}`);
}

const discrepancies: string[] = [];
const total = TOTALS.find((t) => t.pillar === "total")!;
discrepancies.push(
  `Activities: the report counts ${total.activities}, describes ${activities.length}.`,
);
for (const t of TOTALS) {
  if (t.pillar === "total") continue;
  const list = activities.filter((a) => a.pillar === t.pillar);
  const online = sumBy(list, (a) => a.online);
  const inPerson = sumBy(list, (a) => a.inPerson.value ?? 0);
  const raised = sumBy(list, (a) => a.raised ?? 0);
  if (list.length !== t.activities)
    discrepancies.push(`${t.pillar}: ${t.activities} activities counted, ${list.length} listed.`);
  if (online !== t.online)
    discrepancies.push(
      `${t.pillar}: online rows add up to ${online}, the official total is ${t.online} (difference ${t.online - online}).`,
    );
  if (inPerson !== t.inPerson) {
    const textual = list.filter((a) => a.inPerson.value === null).map((a) => `#${a.n}`);
    discrepancies.push(
      `${t.pillar}: in-person rows add up to ${inPerson}${textual.length ? ` (+ text-only ${textual.join(", ")})` : ""}, the official total is ${t.inPersonLabel}.`,
    );
  }
  if (raised !== t.raised)
    discrepancies.push(`${t.pillar}: raised ${raised} vs official ${t.raised}.`);
}
discrepancies.push(
  hoursSum === MEMBERSHIP.hours
    ? `Volunteer hours: the ${activeMembers.length} rows add up to ${hoursSum} (matches).`
    : `Volunteer hours: the ${activeMembers.length} rows add up to ${hoursSum}, the report says ${MEMBERSHIP.hours} (difference ${MEMBERSHIP.hours - hoursSum}).`,
);

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

type Occurrence = { rId: string; path: string; where: string; activity: number | null };
const occurrences: Occurrence[] = [];
for (const part of ["word/header1.xml", "word/header2.xml", "word/footer1.xml"]) {
  if (!zip.has(part)) continue;
  const partRels = parseRels(xml(part.replace("word/", "word/_rels/") + ".rels"));
  for (const rId of blipIds(xml(part)))
    occurrences.push({ rId, path: partRels.get(rId)!, where: part, activity: null });
}
for (const b of blocks) {
  if (b.kind === "p") {
    for (const rId of b.images)
      occurrences.push({
        rId,
        path: rels.get(rId)!,
        where: `paragraph «${b.text}»`,
        activity: null,
      });
    continue;
  }
  b.table.rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      for (const rId of cell.images) {
        const n = b.table === activityTable ? Number(cellText(row, 0)) : NaN;
        occurrences.push({
          rId,
          path: rels.get(rId)!,
          where: `table ${b.table.index} row ${r} cell ${c}`,
          activity: Number.isInteger(n) ? n : null,
        });
      }
    }),
  );
}

rmSync(`${MEDIA_DIR}/web`, { recursive: true, force: true });
mkdirSync(`${MEDIA_DIR}/originals`, { recursive: true });
const seen = new Map<string, string>();
const orderOf = new Map<number, number>();
const manifest: Manifest = { source: DOCX, images: [] };
for (const o of occurrences) {
  const bytes = zip.get(o.path);
  if (!bytes) throw new Error(`Image ${o.rId} (${o.path}) missing from the .docx`);
  const file = o.path.split("/").at(-1)!;
  const hash = sha256(bytes);
  const meta = await sharp(bytes).metadata();
  const base = {
    file,
    sha256: hash,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    where: o.activity ? `activity #${o.activity}, ${o.where}` : o.where,
    activity: o.activity,
    original: `${MEDIA_DIR}/originals/${file}`,
  };
  writeFileSync(base.original, bytes);

  const firstFile = seen.get(hash);
  if (firstFile) {
    manifest.images.push({
      ...base,
      order: null,
      duplicateOf: firstFile,
      keep: false,
      reason: `Exact duplicate of ${firstFile} (same hash).`,
      alt: "",
      altEn: "",
      output: null,
    });
    continue;
  }
  seen.set(hash, file);

  const review = PHOTO_REVIEW[hash.slice(0, 12)];
  if (!review)
    throw new Error(
      `Image ${file} (${hash.slice(0, 12)}, ${base.where}) has no review decision: look at it and add it to PHOTO_REVIEW.`,
    );
  if (!review.keep || !o.activity) {
    manifest.images.push({
      ...base,
      order: null,
      duplicateOf: null,
      keep: false,
      reason: review.keep ? "Not in an activity row." : review.reason,
      alt: "",
      altEn: "",
      output: null,
    });
    continue;
  }

  const order = (orderOf.get(o.activity) ?? 0) + 1;
  orderOf.set(o.activity, order);
  const activity = activities.find((a) => a.n === o.activity)!;
  const nn = String(order).padStart(2, "0");
  const key = `content/${SCHOOL_YEAR}/${activity.slug}/${nn}.webp`;
  const thumbKey = `content/${SCHOOL_YEAR}/${activity.slug}/${nn}-thumb.webp`;
  const outFile = `${MEDIA_DIR}/web/${activity.slug}/${nn}.webp`;
  const thumbFile = `${MEDIA_DIR}/web/${activity.slug}/${nn}-thumb.webp`;
  mkdirSync(dirname(outFile), { recursive: true });

  // sharp drops EXIF/XMP/ICC text by default (no withMetadata), so no GPS survives.
  const pipeline = () => {
    const img = sharp(bytes).rotate();
    return review.crop ? img.extract(review.crop) : img;
  };
  const full = await pipeline()
    .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  const thumb = await pipeline()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  for (const out of [full.data, thumb.data]) {
    const m = await sharp(out).metadata();
    if (m.exif || m.xmp || m.iptc) throw new Error(`${file}: metadata left in the WebP output`);
  }
  writeFileSync(outFile, full.data);
  writeFileSync(thumbFile, thumb.data);
  manifest.images.push({
    ...base,
    order,
    duplicateOf: null,
    keep: true,
    reason: review.note ?? "",
    alt: review.alt,
    altEn: review.altEn,
    output: {
      key,
      thumbKey,
      file: outFile,
      thumbFile,
      width: full.info.width,
      height: full.info.height,
      thumbWidth: thumb.info.width,
      thumbHeight: thumb.info.height,
      md5: md5(full.data),
      thumbMd5: md5(thumb.data),
    },
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const report: Report = {
  schoolYear: SCHOOL_YEAR,
  contentVersion: CONTENT_VERSION,
  source: { file: DOCX, sha256: sha256(docxBytes) },
  club: CLUB,
  leaders,
  membership: { totalJoined: MEMBERSHIP.totalJoined, active: MEMBERSHIP.active, hours: hoursSum },
  activeMembers,
  organisations: ORGANISATIONS.map((o) => ({ ...o })),
  activities,
  totals: TOTALS.map((t) => ({ ...t })),
  discrepancies: [...discrepancies, ...issues],
};

const json = JSON.stringify(report, null, 2) + "\n";
const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
// Phone numbers (8 digits in Mongolia) must never reach any output.
for (const [name, text] of [
  [OUT_JSON, json],
  ["manifest.json", manifestJson],
] as const)
  if (/(?<![\d.])\d{8}(?![\d.])/.test(text.replace(/"(sha256|md5|thumbMd5)": "[0-9a-f]+"/g, "")))
    throw new Error(`${name}: looks like it contains a phone number — not written`);
writeFileSync(OUT_JSON, json);
writeFileSync(`${MEDIA_DIR}/manifest.json`, manifestJson);

const kept = manifest.images.filter((i) => i.keep);
console.log(
  `✅ ${OUT_JSON}: ${leaders.length} leaders, ${activeMembers.length} active members (${hoursSum} h), ${activities.length} activities.`,
);
console.log(
  `✅ ${MEDIA_DIR}/manifest.json: ${manifest.images.length} image references, ${kept.length} photos kept, ${manifest.images.length - kept.length} skipped.`,
);
console.log("\nDifferences between the .docx and the values used:");
for (const i of issues) console.log(`  • ${i}`);
console.log("\nReport arithmetic:");
for (const d of discrepancies) console.log(`  • ${d}`);
