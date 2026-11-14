-- Site settings redesign: explicit EMPTY default rows (no sample values).
-- INSERT OR IGNORE never overwrites settings an admin has already saved.
-- `club`, `helpOptions` and `page.about` are intentionally not inserted: without a row the app
-- uses its built-in defaults (founded year, join-form options, draft About text).
-- Keep an old single donation link (legacy `donationUrl` row) in the new `donation` shape.
INSERT OR IGNORE INTO `settings` (`key`, `value`)
  SELECT 'donation', json_object('url', json_extract(`value`, '$'), 'text', '', 'textEn', '')
  FROM `settings` WHERE `key` = 'donationUrl' AND json_type(`value`) = 'text';
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`) VALUES
  ('contact', '{"address":"","addressEn":"","email":"","phone":"","officeHours":"","officeHoursEn":"","mapEmbedUrl":"","mapLat":"","mapLng":""}'),
  ('socials', '[]'),
  ('stats', '[]'),
  ('partners', '[]'),
  ('donation', '{"url":"","text":"","textEn":""}'),
  ('branding', '{"schoolLogoUrl":"","unicefLogoUrl":"","heroImageUrl":"","heroImageAlt":"","heroImageAltEn":""}');
--> statement-breakpoint
-- The old placeholder-based shapes are replaced: drop the legacy donation key and any
-- old-format stats object (an array is the new format).
DELETE FROM `settings` WHERE `key` = 'donationUrl' AND EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'donation');
--> statement-breakpoint
UPDATE `settings` SET `value` = '[]' WHERE `key` = 'stats' AND json_type(`value`) = 'object';
