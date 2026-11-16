-- Content & admin UX: featured news, SEO fields, photo album under a post, albums linked to
-- activities, and the FAQ page.
CREATE TABLE `faqs` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`question_en` text,
	`answer` text NOT NULL,
	`answer_en` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `faqs_order_idx` ON `faqs` (`sort_order`);--> statement-breakpoint
ALTER TABLE `albums` ADD `event_id` text REFERENCES events(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `news` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `news` ADD `meta_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `news` ADD `meta_description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `news` ADD `album_id` text REFERENCES albums(id) ON DELETE set null;