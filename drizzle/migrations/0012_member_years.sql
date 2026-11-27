CREATE TABLE `member_years` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`school_year` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`position_en` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_publicly` integer DEFAULT false NOT NULL,
	`consent_confirmed_at` integer,
	`consent_confirmed_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consent_confirmed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_years_member_year_idx` ON `member_years` (`member_id`,`school_year`);--> statement-breakpoint
CREATE INDEX `member_years_year_idx` ON `member_years` (`school_year`,`role`,`sort_order`);--> statement-breakpoint
-- Backfill (additions only; nothing is changed or deleted): every existing member gets one
-- membership row in their school year — the stored one when valid, else 2025-2026 (the club's
-- first year: the 5 leaders and the 52 report members). Role, position, order, show_publicly
-- and the consent record are copied as they are. The old `members` columns stay untouched.
-- Deterministic ids + INSERT OR IGNORE: running it twice changes nothing.
INSERT OR IGNORE INTO `member_years` (`id`, `member_id`, `school_year`, `role`, `position`, `position_en`, `sort_order`, `show_publicly`, `consent_confirmed_at`, `consent_confirmed_by`, `created_at`, `updated_at`)
SELECT
  'my-' || `id` || '-' || CASE WHEN `school_year` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]' THEN `school_year` ELSE '2025-2026' END,
  `id`,
  CASE WHEN `school_year` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]' THEN `school_year` ELSE '2025-2026' END,
  CASE WHEN `group` = 'leadership' THEN 'leadership' ELSE 'member' END,
  `role`,
  `role_en`,
  `sort_order`,
  `show_publicly`,
  `consent_confirmed_at`,
  `consent_confirmed_by`,
  `created_at`,
  `created_at`
FROM `members`;
