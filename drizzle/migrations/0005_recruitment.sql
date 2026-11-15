CREATE TABLE `application_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_blocks_value_idx` ON `application_blocks` (`kind`,`value`);--> statement-breakpoint
CREATE TABLE `recruitment_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`school_year` text NOT NULL,
	`opens_at` integer NOT NULL,
	`closes_at` integer NOT NULL,
	`capacity` integer,
	`when_full` text DEFAULT 'waitlist' NOT NULL,
	`classes` text DEFAULT '[]' NOT NULL,
	`intro_text` text DEFAULT '' NOT NULL,
	`intro_text_en` text,
	`closed_message` text DEFAULT '' NOT NULL,
	`closed_message_en` text,
	`questions` text DEFAULT '[]' NOT NULL,
	`show_banner` integer DEFAULT true NOT NULL,
	`ip_limit_per_10_min` integer DEFAULT 1 NOT NULL,
	`ip_limit_per_day` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recruitment_periods_window_idx` ON `recruitment_periods` (`opens_at`,`closes_at`);--> statement-breakpoint
ALTER TABLE `applications` ADD `period_id` text REFERENCES recruitment_periods(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `tracking_code` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `phone_normalized` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `ip_hash` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `spam_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `spam_flags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `answers` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `reviewer_id` text REFERENCES user(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `member_id` text REFERENCES members(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `applications_tracking_idx` ON `applications` (`tracking_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_period_phone_idx` ON `applications` (`period_id`,`phone_normalized`);--> statement-breakpoint
CREATE INDEX `applications_ip_idx` ON `applications` (`ip_hash`,`created_at`);