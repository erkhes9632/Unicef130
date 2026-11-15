-- Clerk accounts: `users` mirror (Clerk user id), login-first applications, member links,
-- volunteer sign-ups and hours. Old actor/author ids pointed at the previous password-based
-- accounts, which Clerk accounts replace, so they are cleared. Applications marked spam become rejected.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE TABLE `event_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_signups_event_user_idx` ON `event_signups` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_signups_user_idx` ON `event_signups` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text,
	`banned` integer DEFAULT false NOT NULL,
	`apply_blocked` integer DEFAULT false NOT NULL,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`last_sign_in_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE TABLE `volunteer_hours` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`event_id` text,
	`school_year` text NOT NULL,
	`hours` real NOT NULL,
	`date` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `volunteer_hours_member_idx` ON `volunteer_hours` (`member_id`,`school_year`);--> statement-breakpoint
CREATE INDEX `volunteer_hours_year_idx` ON `volunteer_hours` (`school_year`);--> statement-breakpoint
DROP TABLE `application_blocks`;--> statement-breakpoint
CREATE TABLE `__new_activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text DEFAULT '' NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_activity_log`("id", "user_id", "action", "entity_type", "entity_id", "summary", "details", "created_at") SELECT "id", NULL, "action", "entity_type", "entity_id", "summary", "details", "created_at" FROM `activity_log`;--> statement-breakpoint
DROP TABLE `activity_log`;--> statement-breakpoint
ALTER TABLE `__new_activity_log` RENAME TO `activity_log`;--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`period_id` text,
	`full_name` text NOT NULL,
	`class_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`reason` text NOT NULL,
	`help_with` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`consent_at` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`decision_message` text DEFAULT '' NOT NULL,
	`decided_by` text,
	`decided_at` integer,
	`sheets_synced_at` integer,
	`sheets_error` text,
	`member_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_id`) REFERENCES `recruitment_periods`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_applications`("id", "user_id", "period_id", "full_name", "class_name", "phone", "email", "reason", "help_with", "answers", "consent_at", "status", "notes", "decision_message", "decided_by", "decided_at", "sheets_synced_at", "sheets_error", "member_id", "created_at", "updated_at") SELECT "id", NULL, "period_id", "full_name", "class_name", "phone", "email", "reason", "help_with", "answers", "consent_at", CASE "status" WHEN 'spam' THEN 'rejected' ELSE "status" END, "notes", '', NULL, NULL, "sheets_synced_at", "sheets_error", "member_id", "created_at", "updated_at" FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
CREATE INDEX `applications_status_created_idx` ON `applications` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_user_period_idx` ON `applications` (`user_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `applications_period_idx` ON `applications` (`period_id`);--> statement-breakpoint
CREATE TABLE `__new_news` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`title_en` text,
	`excerpt` text DEFAULT '' NOT NULL,
	`excerpt_en` text,
	`content` text NOT NULL,
	`content_en` text,
	`cover_url` text,
	`category` text DEFAULT 'activity' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`author_id` text,
	`sdgs` text DEFAULT '[]' NOT NULL,
	`event_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_news`("id", "slug", "title", "title_en", "excerpt", "excerpt_en", "content", "content_en", "cover_url", "category", "tags", "status", "published_at", "author_id", "sdgs", "event_id", "created_at", "updated_at") SELECT "id", "slug", "title", "title_en", "excerpt", "excerpt_en", "content", "content_en", "cover_url", "category", "tags", "status", "published_at", NULL, "sdgs", "event_id", "created_at", "updated_at" FROM `news`;--> statement-breakpoint
DROP TABLE `news`;--> statement-breakpoint
ALTER TABLE `__new_news` RENAME TO `news`;--> statement-breakpoint
CREATE UNIQUE INDEX `news_slug_idx` ON `news` (`slug`);--> statement-breakpoint
CREATE INDEX `news_status_published_idx` ON `news` (`status`,`published_at`);--> statement-breakpoint
ALTER TABLE `events` ADD `signup_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `signup_capacity` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `signup_deadline` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `user_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `members` ADD `email` text;--> statement-breakpoint
ALTER TABLE `members` ADD `team` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `anonymized` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_idx` ON `members` (`user_id`);--> statement-breakpoint
ALTER TABLE `recruitment_periods` DROP COLUMN `ip_limit_per_10_min`;--> statement-breakpoint
ALTER TABLE `recruitment_periods` DROP COLUMN `ip_limit_per_day`;