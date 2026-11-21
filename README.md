# 130 UNICEF Club

Website for the UNICEF club at School No. 130 in Ulaanbaatar. The club started in 2025, and this site is where we post news and events, show what we've achieved each year, and run membership sign-ups.

Live at **[130foreverychild.site](https://130foreverychild.site)** (Mongolian by default, English at `/en`).

## What's on the site

- **Public pages:** about, impact report, news, events, gallery, FAQ and contact. Available in Mongolian and English, light and dark.
- **Membership:** when enrollment is open, students sign in and apply. Admins review applications, and accepted students become members.
- **Member area (`/me`):** volunteer hours, event sign-ups and certificates.
- **Admin panel (`/admin`):** content, applications, users, attendance and site settings.

There are three kinds of accounts: applicants (anyone who has signed in), members, and admins. Admins can also use the member area.

## Stack

Next.js 16 (App Router, Server Actions) with TypeScript, Tailwind v4 and shadcn/ui. Translations use next-intl.

It runs on Cloudflare Workers through `@opennextjs/cloudflare`. Data is in D1 (through Drizzle) and images are in R2. Sign-in is handled by Clerk (Google or an email code, no passwords). The contact form is protected by Turnstile. I use Bun for everything, not npm or yarn.

```
src/app/[locale]   public pages
src/app/admin      admin panel
src/lib            logic and data access
src/db/schema.ts   database tables
drizzle/           migrations
messages/          mn / en translations
scripts/           helper scripts
tests/, e2e/       unit and Playwright tests
worker.ts          Worker entry + daily cron
```

## Running it locally

You need Bun 1.3 or newer. You don't need a Cloudflare account, because D1 and R2 are emulated locally.

```bash
bun install
cp .dev.vars.example .dev.vars    # add your Clerk *development* keys (pk_test_ / sk_test_)
bun run db:migrate:local
bun run db:seed:local             # sample content, local only
bun run dev                       # http://localhost:3000
```

Sign in once, then make yourself an admin:

```bash
bun run admin:grant -- you@example.com --dev
```

Run `bun run hooks:install` once so that `bun run check` runs before every commit.

`bun run preview` runs the real Worker build on http://localhost:8787. Locally, Turnstile uses test keys and Google Sheets sync is skipped.

### Useful commands

| Command                                   | What it does                                 |
| ----------------------------------------- | -------------------------------------------- |
| `bun run check`                           | lint, typecheck, format, knip, unit tests    |
| `bun run cf:build`                        | build the Worker bundle                      |
| `bun run preview`                         | run the Worker locally                       |
| `bun run test:e2e`                        | Playwright tests (needs preview running)     |
| `bun run db:generate`                     | create a migration after editing `schema.ts` |
| `bun run db:reset:local`                  | wipe and rebuild the local DB                |
| `bun run admin:grant -- <email> [--dev]`  | give someone admin                           |
| `bun run admin:revoke -- <email> [--dev]` | remove admin (won't remove the last admin)   |
| `bun run brand:assets`                    | generate favicon and OG image from the logo  |
| `bun run report:import -- --local`        | rebuild the yearly report content locally    |

## Deploying

Deploys are done by hand. There's no CI. Check you're logged in to the right Cloudflare account first (`bunx wrangler whoami`).

```bash
git pull && bun install
bun run check && bun run cf:build
bunx wrangler d1 migrations list DB --remote   # anything pending?
bun run deploy
```

If there's a new migration, back up first, then run `bun run db:migrate:remote` before deploying. If a migration drops a column or table, ship the code that stops using it first, and only run the migration after that.

Never run `db:seed:local` against production.

**Production resources**

- Worker: `unicef-club-130`
- D1: `unicef-club-130-db`
- R2: `unicef-club-130-media` and `unicef-club-130-opennext-cache`
- Cron: runs daily at 03:30 Ulaanbaatar time to clean up expired applications and rate limits

### Backups

```bash
bunx wrangler d1 export DB --remote --output private/backup-$(date +%F).sql
bunx wrangler d1 time-travel info DB
bunx wrangler d1 time-travel restore DB --timestamp=<ISO time>
```

A restore rolls back the whole database, so export first. `private/` is gitignored because it contains member names.

### Secrets

Secrets go in with `bunx wrangler secret put <NAME>`. They never go in files, git or chat.

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `TURNSTILE_SECRET_KEY`
- `GOOGLE_*` (optional, for Sheets sync)

Public config (`SITE_URL`, the Clerk publishable key, the Turnstile site key) lives in `wrangler.jsonc` under `vars`.

**To rotate a secret:**

1. Create a new value in Clerk or Turnstile.
2. Run `secret put` with the new value.
3. Check that sign-in, the contact form and the webhooks still work.
4. Delete the old value.

Rotate every secret when the person responsible for the site changes.

### Logs

`bunx wrangler tail --status error`, or Cloudflare dashboard → Workers → unicef-club-130 → Observability. Logs only contain IDs, never personal info.

## Admin access

**First admin:**

1. Sign in on the site once.
2. Run `bun run admin:grant -- <your-email>`. It asks for the production Clerk secret and doesn't store it.
3. Refresh the page. An **Admin** button appears in the header (on mobile, it's in the menu).

After that, new admins are added from **Admin → Users → Make admin**. The person has to sign in once first.

**Admin button not showing?**

- Make sure you're signed in with the right email (the error page shows which account you're using).
- Try "Sign out and sign in again".
- In Clerk, check that the user's public metadata contains `{"role":"admin"}`.
- Also check that the session token template still contains `{"role":"{{user.public_metadata.role}}"}`.

Admins can't demote, ban or delete themselves, and the last admin can't be removed. At least two people (the club lead and the supervising teacher) should have access to Cloudflare and Clerk, with 2FA turned on.

## Admin panel in short

- **Enrollment:** open and close dates, which grades can apply, extra questions and a capacity limit. While enrollment is open, a banner shows on the site.
- **Applications:** move each one through New → Reviewing → Interview → Accepted / Rejected / Waitlist, and export to CSV. Accepting an application makes the person a member.
- **Users:** search, change roles, deactivate (can be undone) or delete for good. Deleting removes personal data, but the volunteer hours stay in the totals anonymously.
- **Events:** mark attendance. Marking someone as present adds their volunteer hours.
- **Content:** news, gallery, FAQ, about page and site settings. Sections left empty are simply hidden. If an English field is empty, the Mongolian text is shown instead.
- **System status:** health of D1, R2, Clerk, webhooks and Turnstile, plus a content export.

Shortcuts: `Ctrl/⌘ + K` to search, `Ctrl/⌘ + S` to save.

## Yearly report

The club's annual report (`private/report-<year>.docx`, never committed) is the source of the
report content: activities (news posts + past events), photo albums, official totals, home/impact
numbers, partners, the About story and the private member list (names and hours stay hidden).
Curated numbers, translations and photo decisions live in `scripts/report/content-<year>.ts`.

```bash
bun run report:import -- --local                 # parse → build → apply to the local D1 + R2
bun scripts/report/run-import.ts --local --dry-run
```

1. `scripts/report/parse-docx.ts` reads the .docx → `private/report-<year>.json` (no phone numbers)
   and `private/report-media/` (manifest, originals, WebP 1600 px + 480 px thumbs, no EXIF/GPS).
   Every image needs a decision in `PHOTO_REVIEW`; differences with the .docx are printed.
2. `scripts/report/build-import.ts` → `private/import-<year>.sql` + `private/r2-upload-list.txt`.
3. `scripts/report/run-import.ts` applies the SQL and syncs R2 under `content/` (uploads changed
   objects, deletes unreferenced `content/` objects). Running it twice changes nothing.

**Wiped and rebuilt:** news, events, albums, images, impact numbers, slug redirects, members,
settings `stats` / `partners` and the report fields of `club` / `page.about`. Rows linked to an
account, an application, an event sign-up or logged hours are kept. **Never touched:** users,
applications, enrollment rounds, sign-ups, logged hours, audit log, rate limits, messages, FAQ and
all other settings.

Production (only by hand, after a backup):

```bash
bunx wrangler d1 export DB --remote --output private/backups/before-import-$(date +%F-%H%M).sql
bun run db:migrate:remote        # before deploying code that reads new columns (e.g. images.alt_en)
bun scripts/report/run-import.ts --remote --dry-run
bun scripts/report/run-import.ts --remote --confirm-production   # refuses without a backup < 60 min
```

Pages are rendered per request (`no-store`), so no cache purge is needed. Roll back with the
backup or D1 Time Travel (`bunx wrangler d1 time-travel restore DB --timestamp <before-import>`).

## Privacy

Most of our users are students under 18, so we keep things minimal. More details are on `/privacy`.

- We only collect what forms actually need. From Google we only take name, email and photo.
- Only admins can see applications, phone numbers and messages.
- Member names are shown publicly only with parental consent. Individual volunteer hours are never public.
- Rejected applications are deleted automatically 90 days after enrollment closes (this can be changed).
- Don't share CSV exports or backups, and never commit `private/` or `.dev.vars`.

## Handing over to next year's team

1. The new lead signs in, and a current admin makes them an admin.
2. Deactivate the outgoing team's accounts. Don't delete them, so the history stays.
3. Update who has access to Cloudflare, Clerk and GitHub. Keep at least two people on each.
4. Rotate the secrets.
5. Write down when the domain renews and who pays for it.
6. Create the new school year's enrollment and add last year's report.
7. Read this file and `DEPLOY_CHECKLIST.md`, and try publishing a test news post.

## Notes for developers

- Code, comments and commit messages are in English (Conventional Commits). All UI text goes in `messages/*.json`.
- Permissions are checked on the server. For pages, use `requireAdmin()` and `requireMember()`. For server actions, use `assertAdmin()` and `assertMember()`. Both live in `src/lib/auth/session.ts`. Middleware only checks whether someone is signed in.
- Clerk only loads on the sign-in, join, me and admin routes. The public header is rendered on the server.
- Use `logger` instead of `console`, and log IDs, not personal info.
- After touching auth, run `bun run preview` and `bun run test:e2e`.

## Design system

The look is warm and friendly: an off-white and cream light theme, a warm charcoal dark theme, UNICEF cyan for primary actions, with sun yellow and coral as accents. Each pillar has its own colour: Advocacy is cyan, Education is purple, Fundraising is gold.

- **Tokens only.** Colours, shadows and surfaces are CSS variables in `src/app/globals.css`, with one value for light and one for dark. Components use token classes such as `bg-card`, `text-muted-foreground`, `bg-surface-2`, `text-brand-cyan-strong` and `shadow-soft`, never raw hex or palette shades. `tests/design.test.ts` fails on raw colours. White and black are allowed only in the documented places, such as text on SDG tiles and logo tiles.
- **Contrast.** Every text and background pair passes WCAG AA in both themes. Primary buttons are cyan with dark ink text, because white on cyan is too faint. Links and focus rings use the darker `#086F99` / `#0A7FAE` in light mode.
- **Shared components:**
  - `BrandLockup` (variants `header`, `footer`, `sidebar`, `compact`), `Section` (`surface="base" | "tint" | "card"`), `Eyebrow`, `SectionHeading`;
  - `StatTile`, `PartnerChip`, `InfoNote`, `EmptyState`, `UntranslatedBadge`;
  - `CoverImage` (shows a pillar-tinted card with a date stamp until a photo is uploaded), `HeroCollage`;
  - `Button` (44 px tall; variants include `warm`), `ErrorSummary` for forms, `StickyActions` for long admin forms.
- **Motion.** Sections fade in once per page view (`.reveal`, `.reveal-group`, `.grow-x`, `.draw-line`, driven by `components/layout/reveal-observer.tsx`). Cards lift slightly on hover (`hover-lift`), and numbers count up once. Nothing is hidden without JavaScript, and all motion is off when the device asks for reduced motion.
- **Languages.** Every string lives in both `messages/mn.json` and `messages/en.json` (a test checks that they match). On English pages, news or events without an English version are shown in Mongolian with an "Available in Mongolian" badge.
- **Header.** The desktop menu appears from 1024 px wide; below that there's a drawer. There's one role button: visitors see "Become a member", members see "My page", admins see "Admin".

## Showing student names (`SHOW_LEADER_NAMES`)

Students' names stay hidden until the club has written consent from parents or guardians. Two switches in `src/config/site.ts` control this:

```ts
export const SHOW_LEADER_NAMES = false; // leadership cards: role + initial avatar only
export const SHOW_MEMBER_NAMES = false; // /members: aggregate numbers only
```

Set one to `true` and deploy to show names. Even then, a name is shown only if an admin has marked that person as public (Admin → Members → "Нэрийг нийтэд харуулах").

## Swapping the logo

The logo slot is the `BrandLockup` component. No code change is needed to swap logos:

1. Go to Admin → Site settings → Logo and upload the school and UNICEF logos (PNG, JPG or WebP; files with white backgrounds are fine, because the logos sit on a light tile).
2. Or put `public/logos/school-130.png` and `public/logos/unicef.png` in the repo, run `bun run brand:assets` (this also regenerates the social image and icons) and deploy.

Each logo fits into a fixed square box, so wide or tall logos never overlap the club name. With no logo at all, a "130" badge is shown instead.
