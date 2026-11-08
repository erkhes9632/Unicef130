/**
 * Seeds the LOCAL D1 database with sample Mongolian content (from src/lib/mock/*) and default
 * site settings. Safe to re-run: content tables are cleared first. Users are NOT touched —
 * create the first admin with `bun run admin:create` (Phase 4).
 *
 *   bun run db:migrate:local && bun run db:seed:local
 *   bun scripts/seed.ts --print-sql > seed.sql   (SQL only, nothing executed)
 */
import {
  fallbackContact,
  fallbackDonationUrl,
  fallbackSocials,
  fallbackStats,
} from "@/config/site";
import { mockEvents } from "@/lib/mock/events";
import { mockAlbums } from "@/lib/mock/gallery";
import { mockMembers } from "@/lib/mock/members";
import { mockNews } from "@/lib/mock/news";
import { insert, runLocalSql } from "./lib/sql";

const ts = (iso: string | null) => (iso ? Date.parse(iso) : null);
const statements: string[] = [
  // Children first (FKs).
  'DELETE FROM "images";',
  'DELETE FROM "albums";',
  'DELETE FROM "news";',
  'DELETE FROM "events";',
  'DELETE FROM "members";',
  'DELETE FROM "settings";',
];

for (const n of mockNews) {
  statements.push(
    insert("news", {
      id: n.id,
      slug: n.slug,
      title: n.title,
      title_en: n.titleEn,
      excerpt: n.excerpt,
      excerpt_en: n.excerptEn,
      content: n.content,
      content_en: n.contentEn,
      cover_url: n.coverUrl,
      category: n.category,
      tags: n.tags,
      status: n.status,
      published_at: ts(n.publishedAt),
    }),
  );
}

for (const e of mockEvents) {
  statements.push(
    insert("events", {
      id: e.id,
      slug: e.slug,
      title: e.title,
      title_en: e.titleEn,
      summary: e.summary,
      summary_en: e.summaryEn,
      content: e.content,
      content_en: e.contentEn,
      cover_url: e.coverUrl,
      location: e.location,
      location_en: e.locationEn,
      starts_at: ts(e.startsAt),
      ends_at: ts(e.endsAt),
      published: e.published,
    }),
  );
}

for (const m of mockMembers) {
  statements.push(
    insert("members", {
      id: m.id,
      name: m.name,
      name_en: m.nameEn,
      role: m.role,
      role_en: m.roleEn,
      class_name: m.className,
      group: m.group,
      photo_url: m.photoUrl,
      show_photo: m.showPhoto,
      sort_order: m.order,
    }),
  );
}

for (const a of mockAlbums) {
  statements.push(
    insert("albums", {
      id: a.id,
      slug: a.slug,
      title: a.title,
      title_en: a.titleEn,
      description: a.description,
      description_en: a.descriptionEn,
      date: a.date,
      cover_url: a.coverUrl,
      published: a.published,
    }),
  );
  for (const img of a.images) {
    statements.push(
      insert("images", {
        id: img.id,
        album_id: a.id,
        url: img.url,
        thumb_url: img.thumbUrl,
        width: img.width,
        height: img.height,
        alt: img.alt,
        sort_order: img.order,
      }),
    );
  }
}

const settingsRows: Record<string, unknown> = {
  contact: fallbackContact,
  socials: fallbackSocials,
  stats: fallbackStats,
  donationUrl: fallbackDonationUrl,
};
for (const [key, value] of Object.entries(settingsRows)) {
  statements.push(insert("settings", { key, value: JSON.stringify(value) }));
}

if (Bun.argv.includes("--print-sql")) {
  // Prints the SQL instead of running it (the developer may apply it to production manually).
  console.log(statements.join("\n"));
  process.exit(0);
}

console.log(`Seeding local D1 with ${statements.length} statements...`);
await runLocalSql(statements, "seed");
console.log("✅ Local D1 seeded.");
