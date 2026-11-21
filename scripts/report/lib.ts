/**
 * Pure parts of the yearly report import (unit-tested in tests/report-import.test.ts):
 * reach labels and the SQL that wipes the report content and inserts it again.
 *
 * Table groups (also listed in README → Yearly report):
 * - WIPE + REIMPORT: news, events*, albums, images, impact_stats, slug_redirects, members*
 *   (*rows linked to an account, an application, a sign-up or logged hours are kept and only
 *   refreshed), settings rows `stats` and `partners`, the report fields of `club`/`page.about`.
 * - KEEP (never touched): users, applications, recruitment_periods, event_signups,
 *   volunteer_hours, activity_log, rate_limit, contact_messages, faqs, all other settings.
 */
import { defaultAbout, defaultSettings } from "@/lib/settings/types";
import { slugify } from "@/lib/slug";
import type { Manifest, Report } from "./types";
import { insert, sqlValue } from "../lib/sql";

export const MEDIA_BUCKET = "unicef-club-130-media";
export const CONTENT_PREFIX = "content/";

export const sumBy = <T>(list: readonly T[], f: (x: T) => number) =>
  list.reduce((s, x) => s + f(x), 0);

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** Display form of an in-person reach: "≈500", "50+", "1,000", or the report's own words. */
export function reachLabels(r: {
  value: number | null;
  approx?: boolean;
  atLeast?: boolean;
  text?: string;
  textEn?: string;
}) {
  if (r.text) return { label: r.text, labelEn: r.textEn ?? r.text };
  if (r.value === null) return { label: "", labelEn: "" };
  const n = fmt(r.value);
  const label = r.approx ? `≈${n}` : r.atLeast ? `${n}+` : n;
  return { label, labelEn: label };
}

/** Report pillars → site keys (news category / event direction / impact direction). */
export const pillarKey = {
  advocacy: "activity",
  education: "education",
  fundraising: "charity",
  total: "total",
} as const;

/** "2025-11-17" → noon in Ulaanbaatar, so a date-only event never shifts a day. */
export const ubNoon = (ymd: string) => Date.parse(`${ymd}T12:00:00+08:00`);

/** Slug as produced by the first import (е → "ye"); old URLs redirect to the current slug. */
const legacySlugify = (s: string) => slugify(s.replace(/е/g, "ye").replace(/Е/g, "Ye"));

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const doc = (paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
});

/** Lead sentence = excerpt/summary; the rest is the body (one paragraph per two sentences). */
export function splitText(text: string) {
  const s = sentences(text);
  const rest = s.slice(1);
  const paragraphs: string[] = [];
  for (let i = 0; i < rest.length; i += 2) paragraphs.push(rest.slice(i, i + 2).join(" "));
  return { lead: s[0] ?? "", body: doc(paragraphs) };
}

const mnDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y} оны ${m}-р сарын ${d}`;
};
const enDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const month = new Date(Date.UTC(y!, m! - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  return `${d} ${month} ${y}`;
};

/** About page story, built only from the report data. */
export function aboutStory(r: Report) {
  const a = (n: number) => r.activities.find((x) => x.n === n);
  const total = r.totals.find((t) => t.pillar === "total")!;
  const [y1, y2] = r.schoolYear.split("-");
  const first = a(5);
  const teams = a(6);
  const mn: string[] = [];
  const en: string[] = [];
  if (first?.inPerson.value) {
    mn.push(
      `Клубын анхны уулзалт ${mnDate(first.start)}-нд болж, ${first.inPerson.value} гишүүн оролцсон. Уулзалтаар клубын зорилго, жилийн төлөвлөгөө болон UNICEF-ийн үндсэн үнэт зүйлсийг танилцуулсан.`,
    );
    en.push(
      `The club's first meeting took place on ${enDate(first.start)} with ${first.inPerson.value} members. At the meeting we introduced the club's goals, the yearly plan and UNICEF's core values.`,
    );
  }
  if (teams) {
    mn.push(
      `${mnDate(teams.start)} гэхэд клуб бараг 100 гишүүнтэй болсон тул гишүүдээ 6 бүлэгт хувааж, хичээлийн жил дуустал хамтран ажилласан.`,
    );
    en.push(
      `By ${enDate(teams.start)} the club had almost 100 members, so we divided the members into 6 groups that worked together until the end of the school year.`,
    );
  }
  mn.push(
    `${y1}–${y2} оны хичээлийн жилд клубт нийт ${r.membership.totalJoined} сурагч элсэж, тэдний ${r.membership.active} нь идэвхтэй гишүүнээр сертификат авсан. Идэвхтэй гишүүд нийт ${fmt(r.membership.hours)} цаг ажилласан.`,
    `Клуб нөлөөлөл, боловсрол, хандив гэсэн гурван чиглэлээр ${total.activities} үйл ажиллагаа зохион байгуулж, биечлэн ${total.inPersonLabel}, онлайнаар ${fmt(total.online)} хүнд хүрч, ${fmt(total.raised)}₮ хандив цуглуулсан.`,
  );
  en.push(
    `In the ${y1}–${y2} school year, ${r.membership.totalJoined} students joined the club in total, and ${r.membership.active} of them received a certificate as active members. The active members worked ${fmt(r.membership.hours)} hours in total.`,
    `Across its three pillars — advocacy, education and fundraising — the club organised ${total.activities} activities, reached ${total.inPersonLabel} people in person and ${fmt(total.online)} online, and raised ${fmt(total.raised)}₮.`,
  );
  return {
    intro: `${r.club.name} нь ${r.club.foundedYear} онд байгуулагдсан, ${r.club.school}ийн сурагчдын клуб юм.`,
    introEn: `The ${r.club.nameEn} is a student club at ${r.club.schoolEn}, founded in ${r.club.foundedYear}.`,
    history: mn.join("\n\n"),
    historyEn: en.join("\n\n"),
  };
}

/** Home / impact numbers (all from the official totals and the membership table). */
export function statItems(r: Report) {
  const total = r.totals.find((t) => t.pillar === "total")!;
  const compact = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}K+` : fmt(n));
  const item = (label: string, labelEn: string, value: string, featured: boolean) => ({
    kind: "custom",
    label,
    labelEn,
    value,
    featured,
  });
  return [
    item("Нийт элссэн гишүүн", "Members joined", fmt(r.membership.totalJoined), true),
    item(
      "Идэвхтэй гишүүн (сертификаттай)",
      "Active members (certified)",
      fmt(r.membership.active),
      false,
    ),
    item("Сайн дурын цаг", "Volunteer hours", fmt(r.membership.hours), true),
    item("Биечлэн хүрсэн хүн", "People reached in person", total.inPersonLabel, true),
    item("Онлайнаар хүрсэн", "People reached online", compact(total.online), false),
    item("Хандиваар цуглуулсан", "Funds raised", `${fmt(total.raised)}₮`, true),
    // Count comes from the official impact total (one source on every page).
    {
      kind: "events",
      label: "Зохион байгуулсан үйл ажиллагаа",
      labelEn: "Activities organised",
      value: "",
      featured: false,
    },
  ];
}

export type Upload = { file: string; key: string; md5: string };

/**
 * The import as SQL statements (no BEGIN/COMMIT: D1 runs a --file as one batch and wrangler strips
 * transaction statements). Deterministic: ids and timestamps are fixed, so a second run writes
 * the same rows.
 */
export function buildImport(r: Report, m: Manifest) {
  const year = r.schoolYear;
  const yy = year.slice(2, 4) + year.slice(7, 9); // "2526"
  const ts = Date.parse(`${r.contentVersion}T00:00:00+08:00`);
  const out: string[] = [];
  const uploads: Upload[] = [];
  const photos = (n: number) =>
    m.images
      .filter((i) => i.keep && i.activity === n && i.output)
      .sort((a, b) => a.order! - b.order!);
  const media = (key: string) => `/media/${key}`;
  /** Insert, or refresh the content columns of a row kept by the wipe (user-linked). */
  const upsert = (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row).filter((c) => c !== "id" && c !== "created_at");
    return insert(table, row as never).replace(
      /;$/,
      ` ON CONFLICT("id") DO UPDATE SET ${cols.map((c) => `"${c}" = excluded."${c}"`).join(", ")};`,
    );
  };

  // --- Wipe (children first). Rows that hold user data are protected by the WHERE clauses. ---
  out.push(
    `PRAGMA defer_foreign_keys = true;`,
    `DELETE FROM "images";`,
    `DELETE FROM "news";`,
    `DELETE FROM "albums";`,
    `DELETE FROM "slug_redirects";`,
    `DELETE FROM "impact_stats";`,
    `DELETE FROM "events" WHERE "id" NOT IN (SELECT "event_id" FROM "event_signups") AND "id" NOT IN (SELECT "event_id" FROM "volunteer_hours" WHERE "event_id" IS NOT NULL);`,
    `DELETE FROM "members" WHERE "user_id" IS NULL AND "id" NOT IN (SELECT "member_id" FROM "applications" WHERE "member_id" IS NOT NULL) AND "id" NOT IN (SELECT "member_id" FROM "volunteer_hours" WHERE "member_id" IS NOT NULL);`,
  );

  // --- Activities: event + album + photos + news post ---
  for (const a of r.activities) {
    const nn = String(a.n).padStart(2, "0");
    const eventId = `e${yy}-${nn}`;
    const albumId = `a${yy}-${nn}`;
    const newsId = `n${yy}-${nn}`;
    const mn = splitText(a.text);
    const en = splitText(a.textEn);
    const list = photos(a.n);
    const cover = list[0]?.output ? media(list[0].output.key) : null;
    const key = pillarKey[a.pillar];

    out.push(
      upsert("events", {
        id: eventId,
        slug: a.slug,
        title: a.title,
        title_en: a.titleEn,
        summary: mn.lead,
        summary_en: en.lead,
        content: mn.body,
        content_en: en.body,
        cover_url: cover,
        location: a.location,
        location_en: a.locationEn || null,
        starts_at: ubNoon(a.start),
        ends_at: a.end ? ubNoon(a.end) : null,
        all_day: true,
        published: true,
        direction: key,
        school_year: year,
        reach_in_person: a.inPerson.label || null,
        reach_in_person_en: a.inPerson.labelEn || null,
        reach_online: a.online,
        donation_amount: a.raised,
        partners: a.partners,
        beneficiaries: a.beneficiaries,
        sdgs: a.sdgs,
        admin_note: a.note,
        signup_enabled: false,
        signup_capacity: null,
        signup_deadline: null,
        created_at: ts,
        updated_at: ts,
      }),
    );
    if (list.length > 0) {
      out.push(
        insert("albums", {
          id: albumId,
          slug: a.slug,
          title: a.title,
          title_en: a.titleEn,
          description: mn.lead,
          description_en: en.lead,
          date: a.start,
          cover_url: null,
          published: true,
          event_id: eventId,
          created_at: ts,
          updated_at: ts,
        }),
      );
      for (const img of list) {
        const o = img.output!;
        out.push(
          insert("images", {
            id: `i${yy}-${nn}-${String(img.order).padStart(2, "0")}`,
            album_id: albumId,
            url: media(o.key),
            thumb_url: media(o.thumbKey),
            width: o.width,
            height: o.height,
            alt: img.alt,
            sort_order: img.order,
            created_at: ts,
          }),
        );
        uploads.push(
          { file: o.file, key: o.key, md5: o.md5 },
          { file: o.thumbFile, key: o.thumbKey, md5: o.thumbMd5 },
        );
      }
    }
    out.push(
      insert("news", {
        id: newsId,
        slug: a.slug,
        title: a.title,
        title_en: a.titleEn,
        excerpt: mn.lead,
        excerpt_en: en.lead,
        content: mn.body,
        content_en: en.body,
        cover_url: cover,
        category: key,
        tags: [],
        status: "published",
        published_at: ubNoon(a.end ?? a.start),
        author_id: null,
        sdgs: a.sdgs,
        event_id: eventId,
        featured: false,
        meta_title: "",
        meta_description: "",
        // The cover is the first photo; the post shows the album only when there are more.
        album_id: list.length > 1 ? albumId : null,
        created_at: ts,
        updated_at: ts,
      }),
    );
    const legacy = `${legacySlugify(a.title)}-${a.start.slice(0, 4)}`;
    if (legacy !== a.slug)
      for (const kind of ["news", "events"] as const)
        out.push(
          insert("slug_redirects", {
            id: `r${yy}-${kind}-${nn}`,
            kind,
            from_slug: legacy,
            to_slug: a.slug,
            created_at: ts,
          }),
        );
  }

  // --- Official totals ---
  const notes: Record<string, string> = {};
  for (const d of r.discrepancies) {
    const p = /^(advocacy|education|fundraising):/.exec(d)?.[1] ?? "total";
    notes[p] = [notes[p], d].filter(Boolean).join(" ");
  }
  for (const t of r.totals)
    out.push(
      insert("impact_stats", {
        id: `s${yy}-${pillarKey[t.pillar]}`,
        school_year: year,
        direction: pillarKey[t.pillar],
        activities: t.activities,
        in_person: t.inPerson,
        in_person_label: t.inPersonLabel,
        online: t.online,
        total: t.total,
        donation_amount: t.raised,
        notes: t.pillar === "total" ? (notes.total ?? "") : (notes[t.pillar] ?? ""),
        created_at: ts,
        updated_at: ts,
      }),
    );

  // --- Members (private: names never public, hours only as the aggregate) ---
  r.leaders.forEach((l, i) =>
    out.push(
      upsert("members", {
        id: `m${yy}-lead-${i + 1}`,
        name: l.name,
        name_en: null,
        role: l.role,
        role_en: l.roleEn,
        class_name: "",
        group: "leadership",
        sort_order: i + 1,
        active: true,
        show_publicly: false,
        volunteer_hours: null,
        school_year: year,
        team: "",
        created_at: ts,
        updated_at: ts,
      }),
    ),
  );
  for (const p of r.activeMembers)
    out.push(
      upsert("members", {
        id: `m${yy}-mem-${String(p.n).padStart(2, "0")}`,
        name: p.name,
        name_en: null,
        role: "Гишүүн",
        role_en: "Member",
        class_name: "",
        group: "member",
        sort_order: 100 + p.n,
        active: true,
        show_publicly: false,
        volunteer_hours: p.hours,
        school_year: year,
        team: "",
        created_at: ts,
        updated_at: ts,
      }),
    );

  // --- Settings: content rows replaced, report fields merged into club / About ---
  const setting = (key: string, value: unknown, merge?: Record<string, unknown>) => {
    const base = `INSERT INTO "settings" ("key", "value", "updated_at") VALUES (${sqlValue(key)}, ${sqlValue(JSON.stringify(value))}, ${ts}) ON CONFLICT("key") DO UPDATE SET `;
    if (!merge) return `${base}"value" = excluded."value", "updated_at" = excluded."updated_at";`;
    const args = Object.entries(merge)
      .map(
        ([k, v]) => `'$.${k}', ${typeof v === "boolean" ? `json('${v}')` : sqlValue(v as never)}`,
      )
      .join(", ");
    return `${base}"value" = json_set("settings"."value", ${args}), "updated_at" = excluded."updated_at";`;
  };
  const club = {
    name: r.club.name,
    nameEn: r.club.nameEn,
    foundedYear: r.club.foundedYear,
  };
  const story = { ...aboutStory(r), historyPublished: true };
  out.push(
    setting("stats", statItems(r)),
    setting(
      "partners",
      r.organisations.map((o) => ({ ...o, logoUrl: "", url: "" })),
    ),
    setting("club", { ...defaultSettings.club, ...club }, club),
    setting("page.about", { ...defaultAbout, ...story }, story),
  );

  return { statements: out, uploads };
}
