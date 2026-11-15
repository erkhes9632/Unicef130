import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
// Auth (Better Auth core tables + admin plugin fields)
// ---------------------------------------------------------------------------

/** admin: everything · editor: news, events, gallery, members · reviewer: applications only. */
export const userRoles = ["admin", "editor", "reviewer"] as const;
export type UserRole = (typeof userRoles)[number];

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  // admin plugin
  role: text("role").notNull().default("editor"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  // two-factor plugin
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** TOTP secret + backup codes (encrypted by Better Auth's two-factor plugin). */
export const twoFactor = sqliteTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: integer("verified", { mode: "boolean" }).default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  },
  (t) => [index("two_factor_user_id_idx").on(t.userId)],
);

/**
 * One-time links created by admins: an invitation to join the admin panel, or a password reset
 * for an existing user. Only the SHA-256 hash of the token is stored; links expire and work once.
 */
export const authTokenKinds = ["invite", "reset"] as const;
export type AuthTokenKind = (typeof authTokenKinds)[number];

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: id(),
    kind: text("kind", { enum: authTokenKinds }).notNull(),
    tokenHash: text("token_hash").notNull(),
    /** Invite: the address being invited. Reset: the user's email (for display). */
    email: text("email").notNull(),
    /** Invite only: role the new account gets. */
    role: text("role"),
    /** Reset only: the account whose password is reset. */
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash)],
);

/**
 * Rate-limit counters shared by all Worker isolates (Better Auth `rateLimit.storage: "database"`
 * and the admin login Server Action). Columns follow Better Auth's `rateLimit` model.
 */
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
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    /** UN Sustainable Development Goals (1–17) the post relates to. */
    sdgs: text("sdgs", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    /** The activity (event) this post reports on, if any. */
    eventId: text("event_id").references((): AnySQLiteColumn => events.id, {
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
    ...timestamps,
  },
  (t) => [index("members_order_idx").on(t.group, t.sortOrder)],
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
    /** Anti-spam limits per network address (a whole school may share one address). */
    ipLimitPer10Min: integer("ip_limit_per_10_min").notNull().default(1),
    ipLimitPerDay: integer("ip_limit_per_day").notNull().default(10),
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
  "spam",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applications = sqliteTable(
  "applications",
  {
    id: id(),
    fullName: text("full_name").notNull(),
    className: text("class_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    reason: text("reason").notNull(),
    helpWith: text("help_with", { mode: "json" }).$type<string[]>().notNull(),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: applicationStatuses }).notNull().default("new"),
    notes: text("notes").notNull().default(""),
    sheetsSyncedAt: integer("sheets_synced_at", { mode: "timestamp_ms" }),
    sheetsError: text("sheets_error"),
    // Recruitment system
    periodId: text("period_id").references(() => recruitmentPeriods.id, { onDelete: "set null" }),
    /** Shown to the applicant after submitting, e.g. "UC-7K3M" (status lookup). */
    trackingCode: text("tracking_code"),
    /** 8 digits; one application per phone per period. */
    phoneNormalized: text("phone_normalized"),
    /** Salted hash of the sender's address (never the address itself). */
    ipHash: text("ip_hash"),
    spamScore: integer("spam_score").notNull().default(0),
    /** Signals behind the score, e.g. ["fast_fill", "repeated_text"]. */
    spamFlags: text("spam_flags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Answers to the period's custom questions, keyed by question id. */
    answers: text("answers", { mode: "json" })
      .$type<Record<string, string | boolean>>()
      .notNull()
      .default(sql`'{}'`),
    reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    /** Member record created when the application was accepted. */
    memberId: text("member_id").references((): AnySQLiteColumn => members.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("applications_status_created_idx").on(t.status, t.createdAt),
    uniqueIndex("applications_tracking_idx").on(t.trackingCode),
    uniqueIndex("applications_period_phone_idx").on(t.periodId, t.phoneNormalized),
    index("applications_ip_idx").on(t.ipHash, t.createdAt),
  ],
);

/** Phones / network addresses an admin blocked from applying for a while. */
export const applicationBlocks = sqliteTable(
  "application_blocks",
  {
    id: id(),
    kind: text("kind", { enum: ["phone", "ip"] }).notNull(),
    /** Normalized phone (8 digits) or the salted address hash. */
    value: text("value").notNull(),
    reason: text("reason").notNull().default(""),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("application_blocks_value_idx").on(t.kind, t.value)],
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
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
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
