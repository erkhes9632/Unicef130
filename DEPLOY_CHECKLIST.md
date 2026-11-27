# Deploy checklist

Production: **https://130foreverychild.site** — Cloudflare Workers (Free plan), deployed by hand.
There is no CI deploy. Details and commands: [README.md](./README.md#deploying).

## Every deploy

1. `git pull && bun install`
2. `bun run check` (lint, types, format, knip, unit tests) and `bun run cf:build` are green.
3. If sign-in, roles or account pages changed: `bun run preview` in one terminal, then
   `bun run test:e2e` (includes the cold-cache test: every public page answers 200 on a cold
   Worker, and 300 requests in bursts of 20 give no 5xx).
4. `bunx wrangler whoami` shows the club's Cloudflare account.
5. Back up the database:
   `bunx wrangler d1 export DB --remote --output private/backups/before-deploy-$(date +%F-%H%M).sql`
6. `bunx wrangler d1 migrations list DB --remote` — if anything is pending, run
   `bun run db:migrate:remote` now (right before the deploy, not hours earlier).
7. `bun run release`: uploads the new version, pre-warms and smoke-tests it at 0 % (visitors stay
   on the live version), then makes it live and smoke-tests the live site. On a failure before
   the switch nothing goes live; after the switch it prints the rollback command.
8. `bunx wrangler tail --format pretty --status error` for 2 minutes: no errors.
9. Open the home page, `/en`, `/members`, `/join`, `/sign-in` and `/admin` (as an admin).

## New migration

- Edit `src/db/schema.ts` → `bun run db:generate` → read the SQL.
- Migrations only add tables, columns and indexes, and backfill them. Never delete data.
- `bun run db:migrate:local` → `bun run preview` → tests.
- A migration that drops something ships separately, after the code that stopped using it is live.
- Rollback: `bunx wrangler d1 time-travel restore DB --timestamp=<before the migration>`, then
  deploy the previous commit.

## After this release (one-time)

- Admin → dashboard → **Шинэ хичээлийн жил эхлүүлэх**: choose the 2026–2027 leaders (and copy
  members if wanted). Until then the site shows the 2025–2026 team with a "coming soon" note.
- Admin → Түгээмэл асуулт: review and publish the FAQ drafts. Admin → Дэмжих хуудас: confirm the
  text with the club.
- If not done yet: delete the old Turnstile secret and widget
  (`bunx wrangler secret delete TURNSTILE_SECRET_KEY`; Cloudflare → Turnstile → delete) and the old
  `BETTER_AUTH_SECRET`.

## Open items for the club (not code)

- Parental consent before showing any student's name (Admin → Гишүүд, per school year).
- Second person with access to Cloudflare and Clerk (the supervising teacher), with 2FA.
- Optional: Cloudflare Web Analytics for the visitor charts (README → Analytics), Google Sheets
  sync (README → Google Sheets), Search Console with `/sitemap.xml`.

## Rotating a secret

Create the new value → `bunx wrangler secret put <NAME>` → check sign-in and the Clerk webhook →
delete the old value. Never paste a secret into a file or a chat.
