-- Removes the previous password-based sign-in (replaced by Clerk in 0006). IRREVERSIBLE: the old
-- admin accounts, sessions, two-factor secrets and invite/reset links are deleted. Take a backup
-- first: bunx wrangler d1 export DB --remote --output backup-before-clerk.sql
-- Child tables go first; `user` is no longer referenced by any other table after 0006.
-- Old login / per-address counters are removed too (only per-account join and contact remain).
DELETE FROM `rate_limit` WHERE `key` NOT LIKE 'join:user:%' AND `key` NOT LIKE 'contact:%';--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
DROP TABLE `auth_tokens`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
DROP TABLE `two_factor`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
DROP TABLE `verification`;