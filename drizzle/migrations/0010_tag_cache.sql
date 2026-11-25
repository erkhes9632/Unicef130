-- OpenNext tag cache (ISR revalidation marks). Same shape as `opennextjs-cloudflare` creates;
-- not part of the Drizzle schema (owned by the cache layer).
CREATE TABLE IF NOT EXISTS `revalidations` (`tag` text NOT NULL, `revalidatedAt` integer NOT NULL, `stale` integer, `expire` integer DEFAULT NULL, UNIQUE(`tag`) ON CONFLICT REPLACE);
