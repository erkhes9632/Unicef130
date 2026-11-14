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

export const userRoles = ["admin", "editor"] as const;
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

export const applicationStatuses = ["new", "accepted", "rejected"] as const;
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
    ...timestamps,
  },
  (t) => [index("applications_status_created_idx").on(t.status, t.createdAt)],
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
    createdAt: timestamps.createdAt,
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);
