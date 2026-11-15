CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `slug_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`from_slug` text NOT NULL,
	`to_slug` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slug_redirects_from_idx` ON `slug_redirects` (`kind`,`from_slug`);--> statement-breakpoint
-- Club description without a hard-coded school year (only when it is still the imported text).
UPDATE `settings`
SET `value` = json_set(`value`,
  '$.description', 'UNICEF Club Mongolia сүлжээний гишүүн клуб.',
  '$.descriptionEn', 'A member club of the UNICEF Club Mongolia network.')
WHERE `key` = 'club'
  AND instr(json_extract(`value`, '$.description'), 'оны хөтөлбөрт хамрагддаг') > 0;
