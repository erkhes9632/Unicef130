import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { appRoles } from "@/lib/auth/roles";
import type { RichTextDoc } from "@/lib/types";

/**
 * D1 (SQLite) schema. Timestamps are stored as integer milliseconds (`timestamp_ms`).
 * After editing: `bun run db:generate` then `bun run db:migrate:local`.
 */

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now)
    .$onUpdate(() => new Date()),
};
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ---------------------------------------------------------------------------
// Accounts (Clerk is the identity provider; this is the D1 mirror)
// ---------------------------------------------------------------------------

/**
 * One row per Clerk user, keyed by the Clerk user id. Kept in sync by the Clerk webhook and by a
 * lazy upsert on the first signed-in request. `role`: admin | member | null (= applicant).
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().default(""),
    name: text("name").notNull().default(""),
    role: text("role", { enum: appRoles }),
    /** Banned in Clerk: cannot sign in; data kept; reversible. */
    banned: integer("banned", { mode: "boolean" }).notNull().default(false),
    /** Admin ticked "дахин өргөдөл гаргахыг хориглох" (abuse). */
    applyBlocked: integer("apply_blocked", { mode: "boolean" }).notNull().default(false),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
    lastSignInAt: integer("last_sign_in_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("users_email_idx").on(t.email), index("users_role_idx").on(t.role)],
);

/** Rate-limit counters shared by all Worker isolates (join submits per account, contact form). */
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** ms timestamp of the last counted request */
  lastRequest: integer("last_request").notNull(),
});

/** Old slug → current slug, so renamed posts/events keep working (permanent redirect). */
export const slugRedirects = sqliteTable(
  "slug_redirects",
  {
    id: id(),
    kind: text("kind", { enum: ["news", "events"] }).notNull(),
    fromSlug: text("from_slug").notNull(),
    toSlug: text("to_slug").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("slug_redirects_from_idx").on(t.kind, t.fromSlug)],
);

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const news = sqliteTable(
  "news",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    excerpt: text("excerpt").notNull().default(""),
    excerptEn: text("excerpt_en"),
    content: text("content", { mode: "json" }).$type<RichTextDoc>().notNull(),
    contentEn: text("content_en", { mode: "json" }).$type<RichTextDoc>(),
    coverUrl: text("cover_url"),
    category: text("category").notNull().default("activity"),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    /** UN Sustainable Development Goals (1–17) the post relates to. */
    sdgs: text("sdgs", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    /** The activity (event) this post reports on, if any. */
    eventId: text("event_id").references((): AnySQLiteColumn => events.id, {
      onDelete: "set null",
    }),
    /** Shown first on the home page and in the news list. */
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    /** Search-engine title / description; empty → the title / excerpt. */
    metaTitle: text("meta_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    /** Photo album shown under the post. */
    albumId: text("album_id").references((): AnySQLiteColumn => albums.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("news_slug_idx").on(t.slug),
    index("news_status_published_idx").on(t.status, t.publishedAt),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    summary: text("summary").notNull().default(""),
    summaryEn: text("summary_en"),
    content: text("content", { mode: "json" }).$type<RichTextDoc>().notNull(),
    contentEn: text("content_en", { mode: "json" }).$type<RichTextDoc>(),
    coverUrl: text("cover_url"),
    location: text("location").notNull().default(""),
    locationEn: text("location_en"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    /** Date-only event (no known time of day): times are never shown. */
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    // Activity report fields (yearly impact report). All optional.
    /** Club direction: activity (Нөлөөлөл) | education | charity — same keys as news categories. */
    direction: text("direction"),
    /** e.g. "2025-2026" */
    schoolYear: text("school_year"),
    /** As written in the report, e.g. "137", "50+", "~500", "Сургуулийн хүрээлэл". */
    reachInPerson: text("reach_in_person"),
    reachInPersonEn: text("reach_in_person_en"),
    reachOnline: integer("reach_online"),
    /** Money raised, in MNT. */
    donationAmount: integer("donation_amount"),
    partners: text("partners", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    beneficiaries: text("beneficiaries", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    sdgs: text("sdgs", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Admin-only note (e.g. data issues in the source report). Never shown publicly. */
    adminNote: text("admin_note").notNull().default(""),
    // Volunteer sign-up for members (/me). Off unless an admin enables it.
    signupEnabled: integer("signup_enabled", { mode: "boolean" }).notNull().default(false),
    /** Places for volunteers; null = no limit (extra sign-ups go to the waitlist when full). */
    signupCapacity: integer("signup_capacity"),
    /** Sign-up closes at this instant; null = when the event starts. */
    signupDeadline: integer("signup_deadline", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("events_slug_idx").on(t.slug),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_year_idx").on(t.schoolYear),
  ],
);

export const members = sqliteTable(
  "members",
  {
    id: id(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    role: text("role").notNull().default(""),
    roleEn: text("role_en"),
    className: text("class_name").notNull().default(""),
    group: text("group", { enum: ["leadership", "member"] })
      .notNull()
      .default("member"),
    photoUrl: text("photo_url"),
    /** Members are mostly minors: photos are only shown publicly with explicit consent. */
    showPhoto: integer("show_photo", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    /** Members are mostly minors: names are listed publicly only after consent. */
    showPublicly: integer("show_publicly", { mode: "boolean" }).notNull().default(false),
    /** Volunteer hours (admin only; used for the aggregate stat, never shown per person). */
    volunteerHours: integer("volunteer_hours"),
    schoolYear: text("school_year"),
    /** The member's own account (approved applicant or linked by an admin). */
    userId: text("user_id").references((): AnySQLiteColumn => users.id, { onDelete: "set null" }),
    /** Admin-only: lets an admin offer "link account to member" when this address signs up. */
    email: text("email"),
    team: text("team").notNull().default(""),
    /** Personal data removed (account deleted); hours stay as anonymous totals. */
    anonymized: integer("anonymized", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("members_order_idx").on(t.group, t.sortOrder),
    uniqueIndex("members_user_idx").on(t.userId),
  ],
);

export const signupStatuses = [
  "registered",
  "waitlist",
  "cancelled",
  "attended",
  "absent",
] as const;
export type SignupStatus = (typeof signupStatuses)[number];

/** A member volunteering for an event (one row per event and account). */
export const eventSignups = sqliteTable(
  "event_signups",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: signupStatuses }).notNull().default("registered"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_signups_event_user_idx").on(t.eventId, t.userId),
    index("event_signups_user_idx").on(t.userId),
  ],
);

/**
 * Volunteer hours log. Rows survive a deleted account: the member row is anonymized, so the
 * yearly totals don't drop. `members.volunteer_hours` holds the imported yearly report total.
 */
export const volunteerHours = sqliteTable(
  "volunteer_hours",
  {
    id: id(),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    schoolYear: text("school_year").notNull(),
    hours: real("hours").notNull(),
    /** Day the work was done. */
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("volunteer_hours_member_idx").on(t.memberId, t.schoolYear),
    index("volunteer_hours_year_idx").on(t.schoolYear),
  ],
);

export const albums = sqliteTable(
  "albums",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description").notNull().default(""),
    descriptionEn: text("description_en"),
    /** YYYY-MM-DD */
    date: text("date").notNull(),
    coverUrl: text("cover_url"),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    /** The activity these photos are from, if any. */
    eventId: text("event_id").references((): AnySQLiteColumn => events.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [uniqueIndex("albums_slug_idx").on(t.slug), index("albums_date_idx").on(t.date)],
);

export const images = sqliteTable(
  "images",
  {
    id: id(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    thumbUrl: text("thumb_url").notNull(),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    alt: text("alt").notNull().default(""),
    /** English alt text; empty → "<album title> — <n>" on English pages. */
    altEn: text("alt_en"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("images_album_order_idx").on(t.albumId, t.sortOrder)],
);

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

/** One custom question on the join form of a recruitment period. */
export type RecruitmentQuestion = {
  id: string;
  type: "text" | "choice" | "checkbox";
  label: string;
  labelEn: string;
  /** `choice` only */
  options: { label: string; labelEn: string }[];
  required: boolean;
};

/**
 * A recruitment window. The join form is open only while `opens_at <= now < closes_at` of one
 * period (periods never overlap). Times are stored as UTC ms; the admin edits them in
 * Asia/Ulaanbaatar time.
 */
export const recruitmentPeriods = sqliteTable(
  "recruitment_periods",
  {
    id: id(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    /** e.g. "2026-2027": accepted applicants become members of this school year. */
    schoolYear: text("school_year").notNull(),
    opensAt: integer("opens_at", { mode: "timestamp_ms" }).notNull(),
    closesAt: integer("closes_at", { mode: "timestamp_ms" }).notNull(),
    /** Max applications that count (new / reviewing / interview / accepted); null = unlimited. */
    capacity: integer("capacity"),
    whenFull: text("when_full", { enum: ["close", "waitlist"] })
      .notNull()
      .default("waitlist"),
    /** Classes offered in the dropdown, e.g. ["6а", "6б", …, "12г"]. */
    classes: text("classes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    introText: text("intro_text").notNull().default(""),
    introTextEn: text("intro_text_en"),
    closedMessage: text("closed_message").notNull().default(""),
    closedMessageEn: text("closed_message_en"),
    questions: text("questions", { mode: "json" })
      .$type<RecruitmentQuestion[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Show the site-wide "recruitment is open" banner while this period is open. */
    showBanner: integer("show_banner", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("recruitment_periods_window_idx").on(t.opensAt, t.closesAt)],
);

export const applicationStatuses = [
  "new",
  "reviewing",
  "interview",
  "accepted",
  "rejected",
  "waitlist",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/**
 * Join applications. Applicants sign in first: one application per account per period. Rejected
 * applications are deleted automatically N days after their period closes (setting).
 */
export const applications = sqliteTable(
  "applications",
  {
    id: id(),
    /** Null only for applications sent before sign-in was required. */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    periodId: text("period_id").references(() => recruitmentPeriods.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    className: text("class_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    reason: text("reason").notNull(),
    helpWith: text("help_with", { mode: "json" }).$type<string[]>().notNull(),
    /** Answers to the period's custom questions, keyed by question id. */
    answers: text("answers", { mode: "json" })
      .$type<Record<string, string | boolean>>()
      .notNull()
      .default(sql`'{}'`),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: applicationStatuses }).notNull().default("new"),
    /** Internal admin notes (never shown to the applicant). */
    notes: text("notes").notNull().default(""),
    /** Optional message the applicant sees with the decision on /join. */
    decisionMessage: text("decision_message").notNull().default(""),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    sheetsSyncedAt: integer("sheets_synced_at", { mode: "timestamp_ms" }),
    sheetsError: text("sheets_error"),
    /** Member record created or linked when the application was accepted. */
    memberId: text("member_id").references((): AnySQLiteColumn => members.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("applications_status_created_idx").on(t.status, t.createdAt),
    uniqueIndex("applications_user_period_idx").on(t.userId, t.periodId),
    index("applications_period_idx").on(t.periodId),
  ],
);

/** Frequently asked questions (/faq), edited in admin. */
export const faqs = sqliteTable(
  "faqs",
  {
    id: id(),
    question: text("question").notNull(),
    questionEn: text("question_en"),
    answer: text("answer").notNull(),
    answerEn: text("answer_en"),
    sortOrder: integer("sort_order").notNull().default(0),
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("faqs_order_idx").on(t.sortOrder)],
);

export const contactMessages = sqliteTable(
  "contact_messages",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull().default(""),
    message: text("message").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("contact_messages_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Yearly impact report
// ---------------------------------------------------------------------------

export const impactDirections = ["activity", "education", "charity", "total"] as const;
export type ImpactDirection = (typeof impactDirections)[number];

/** Official yearly numbers per club direction (one row per school year + direction). */
export const impactStats = sqliteTable(
  "impact_stats",
  {
    id: id(),
    schoolYear: text("school_year").notNull(),
    direction: text("direction", { enum: impactDirections }).notNull(),
    activities: integer("activities").notNull().default(0),
    inPerson: integer("in_person").notNull().default(0),
    /** Display form, e.g. "300+" (falls back to the number). */
    inPersonLabel: text("in_person_label").notNull().default(""),
    online: integer("online").notNull().default(0),
    total: integer("total").notNull().default(0),
    donationAmount: integer("donation_amount").notNull().default(0),
    /** Admin-only notes (e.g. differences with the listed activities). */
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [uniqueIndex("impact_year_direction_idx").on(t.schoolYear, t.direction)],
);

// ---------------------------------------------------------------------------
// Settings & activity
// ---------------------------------------------------------------------------

/** Key/value site settings (contact, socials, stats, donationUrl) stored as JSON. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: timestamps.updatedAt,
});

/** Audit trail for the admin dashboard "recent activity" list. */
export const activityLog = sqliteTable(
  "activity_log",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g. "news.create"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull().default(""),
    /** Changed fields as `{ field: [before, after] }` (no personal data of applicants). */
    details: text("details", { mode: "json" }).$type<Record<string, [unknown, unknown]>>(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("activity_created_idx").on(t.createdAt),
    index("activity_entity_idx").on(t.entityType, t.entityId),
  ],
);
