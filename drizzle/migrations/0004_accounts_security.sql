CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`user_id` text,
	`created_by` text,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_hash_idx` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `two_factor` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` text NOT NULL,
	`verified` integer DEFAULT true,
	`failed_verification_count` integer DEFAULT 0,
	`locked_until` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `two_factor_user_id_idx` ON `two_factor` (`user_id`);--> statement-breakpoint
ALTER TABLE `activity_log` ADD `details` text;--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_enabled` integer DEFAULT false;