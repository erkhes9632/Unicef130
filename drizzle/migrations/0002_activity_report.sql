CREATE TABLE `impact_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year` text NOT NULL,
	`direction` text NOT NULL,
	`activities` integer DEFAULT 0 NOT NULL,
	`in_person` integer DEFAULT 0 NOT NULL,
	`in_person_label` text DEFAULT '' NOT NULL,
	`online` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`donation_amount` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `impact_year_direction_idx` ON `impact_stats` (`school_year`,`direction`);--> statement-breakpoint
ALTER TABLE `events` ADD `all_day` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `direction` text;--> statement-breakpoint
ALTER TABLE `events` ADD `school_year` text;--> statement-breakpoint
ALTER TABLE `events` ADD `reach_in_person` text;--> statement-breakpoint
ALTER TABLE `events` ADD `reach_in_person_en` text;--> statement-breakpoint
ALTER TABLE `events` ADD `reach_online` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `donation_amount` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `partners` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `beneficiaries` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `sdgs` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `admin_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `events_year_idx` ON `events` (`school_year`);--> statement-breakpoint
ALTER TABLE `members` ADD `show_publicly` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `volunteer_hours` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `school_year` text;--> statement-breakpoint
ALTER TABLE `news` ADD `sdgs` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `news` ADD `event_id` text REFERENCES events(id) ON DELETE SET NULL;--> statement-breakpoint
-- Members that already existed were listed publicly before this column existed: keep them so.
UPDATE `members` SET `show_publicly` = 1;
--> statement-breakpoint
-- News categories now follow the club's three directions (+ announcements).
UPDATE `news` SET `category` = 'activity' WHERE `category` IN ('volunteering', 'rights');
