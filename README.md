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
bun run report:import -- --local  # real content from private/ (otherwise the site starts empty)
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
| `bun run cache:warm [-- --url <site>]`    | fill the page cache (runs after `deploy`)    |

## Deploying

Deploys are done by hand. There's no CI. Check you're logged in to the right Cloudflare account first (`bunx wrangler whoami`).

```bash
git pull && bun install
bun run check && bun run cf:build
bunx wrangler d1 migrations list DB --remote   # anything pending?
bun run deploy                                 # build + deploy + cache:warm
```

If there's a new migration, back up first, then run `bun run db:migrate:remote` before deploying. If a migration drops a column or table, ship the code that stops using it first, and only run the migration after that.

Every deploy starts with an empty page cache; `bun run deploy` warms it straight away (see "Performance & caching").

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
- `CF_ANALYTICS_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_WEB_ANALYTICS_SITE_TAG` (optional, for the statistics page — see "Analytics")

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
- **Statistics:** visitors, popular pages, where visitors come from, site speed and the club's own numbers, in plain words (see "Analytics"). A line at the top says whether the site is fine, or what needs doing.

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
   and `private/report-media/` (manifest, originals, WebP 1600 / 960 / 480 px, no EXIF/GPS).
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

The import writes to D1 directly, so cached pages pick it up at their next hourly refresh. To show
it right away, save anything in the admin panel (every admin save refreshes the public pages) or
redeploy. Roll back with the backup or D1 Time Travel
(`bunx wrangler d1 time-travel restore DB --timestamp <before-import>`).

## Analytics

Admin → **Statistik** shows two kinds of numbers:

- **Visitors** from Cloudflare Web Analytics: visits, pages viewed, top pages, where people come
  from, countries, devices and site speed. It uses no cookies and stores no personal data, so no
  cookie banner is needed (this is also stated on `/privacy`).
- **Club numbers** from the database: new users, members, applications, volunteer hours,
  messages. Totals only, never names.

The page loads a small JSON summary from `/api/admin/stats` (admins only) and draws the charts
in the browser; visitor numbers are cached for 10 minutes. "CSV татах" downloads the same totals.

**Setup (free):**

1. Cloudflare dashboard → _Analytics & Logs_ → _Web Analytics_ → _Add a site_ →
   `130foreverychild.site` → automatic setup. Note the **site tag**.
2. _My Profile_ → _API Tokens_ → _Create token_ → custom token with **Account › Account
   Analytics › Read** only, for this account.
3. Copy the **account ID** (Workers overview, right side).
4. `bunx wrangler secret put CF_ANALYTICS_API_TOKEN`, `CF_ACCOUNT_ID`,
   `CF_WEB_ANALYTICS_SITE_TAG`, then deploy.

Without these secrets (or if the API fails) the page says the visitor numbers aren't connected and
everything else still works. Locally, leave them empty in `.dev.vars`.

## Performance & caching

The site runs on the Workers **Free plan**: 10 ms of CPU per request. Rendering a page takes far
more than that, so visitors should only ever get cached pages.

- **Public pages** (`app/[locale]`) are ISR: rendered on the first visit, then served from the
  OpenNext cache (R2 + a per-data-centre copy). `worker.ts` answers repeat visits from the
  Cache API before OpenNext even loads (about 1–2 ms of CPU). Images under `/media/` come straight
  from R2 with a one-year `immutable` cache header.
- **Freshness:** pages refresh in the background every hour, and right after any admin save
  (`revalidateTag(..., "max")`: visitors get the cached page while a Durable Object re-renders it,
  with retries). The data-centre copy lives two minutes.
- **After a deploy** the cache is empty: `bun run deploy` runs `bun run cache:warm`, which visits
  every page from the sitemap one at a time, reads each response to the end, and retries a 5xx
  once. Pages that still fail are listed, but the script exits 0 (`--strict` makes it exit 1).
- **Cold start:** `worker.ts` loads the Next.js server, every route module and the proxy when the
  isolate starts (startup has its own CPU limit; about 90 ms locally). Loaded lazily, the first
  request of an isolate paid for it, and if that request was stopped (Error 1102, or a visitor
  leaving), the half-finished, isolate-wide work broke the other requests of that isolate with
  empty 500s ("This promise was created by a request that has since ended"). For the same
  reason every app response is finished with `waitUntil` even when the visitor leaves
  (`src/lib/finish-request.ts`). `e2e/cold-cache.e2e.ts` checks the first request after a cache
  purge for every public page.
- **Account areas** (`/admin`, `/me`, signed-in `/join`, `/search`) are rendered per request. The
  proxy runs only there and decides per request; `/join` for signed-out visitors (the same view
  for everyone) and the `/sign-in` shell (Clerk runs in the browser) are cached. The data-centre
  copy never stores account areas or responses with cookies (`tests/caching.test.ts`).
- To measure: `bunx wrangler tail` shows `cpuTime` per request; locally, start
  `bunx wrangler dev --inspector-port 9230` and profile with Chrome DevTools.

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
- Permissions are checked on the server. For pages, use `requireAdmin()` and `requireMember()`. For server actions, use `assertAdmin()` and `assertMember()`. Both live in `src/lib/auth/session.ts`. The proxy (`src/proxy.ts`) only runs for the account areas and only checks whether someone is signed in.
- Clerk only loads on the sign-in, join, me and admin routes. Public pages are cached, so the header shows the sign-in state from a display-only cookie (`src/lib/auth/role-hint.ts`); access is always decided on the server.
- Public pages must stay cacheable: no `headers()`, `cookies()` or `searchParams` in `app/[locale]` (except the account pages, which say `dynamic = "force-dynamic"`). Filters read the query string in the browser (`useUrlQuery`).
- Use `logger` instead of `console`, and log IDs, not personal info.
- After touching auth, run `bun run preview` and `bun run test:e2e`.

## Design system

The look is warm and friendly: an off-white and cream light theme, a warm charcoal dark theme, UNICEF cyan for primary actions, with sun yellow and coral as accents. Each pillar has its own colour: Advocacy is cyan, Education is purple, Fundraising is gold.

- **Tokens only.** Colours, shadows and surfaces are CSS variables in `src/app/globals.css`, with one value for light and one for dark. Components use token classes such as `bg-card`, `text-muted-foreground`, `bg-surface-2`, `text-brand-cyan-strong` and `shadow-soft`, never raw hex or palette shades. `tests/design.test.ts` fails on raw colours. White and black are allowed only in the documented places, such as text on SDG tiles and logo tiles.
- **Contrast.** Every text and background pair passes WCAG AA in both themes. Primary buttons are cyan with dark ink text, because white on cyan is too faint. Links and focus rings use the darker `#086F99` / `#0A7FAE` in light mode.
- **Shared components:**
  - `BrandLockup` / `BrandLogo` (variants `horizontal`, `compact`, `stacked`, `mark`), `Section` (`surface="base" | "tint" | "card"`), `Eyebrow`, `SectionHeading`;
  - `StatTile`, `PartnerChip`, `InfoNote`, `EmptyState`, `UntranslatedBadge`;
  - `CoverImage` (shows a pillar-tinted card with a date stamp until a photo is uploaded), `HeroCollage`;
  - `Button` (44 px tall; variants include `warm`), `ErrorSummary` for forms, `StickyActions` for long admin forms.
- **Motion.** Sections fade in once per page view (`.reveal`, `.reveal-group`, `.grow-x`, `.draw-line`, driven by `components/layout/reveal-observer.tsx`). Cards lift slightly on hover (`hover-lift`, transform only), and numbers count up once. Small chips use `tap-target` for a 44 × 44 px hit area. Nothing is hidden without JavaScript, and all motion is off when the device asks for reduced motion.
- **Languages.** Every string lives in both `messages/mn.json` and `messages/en.json` (a test checks that they match). On English pages, news or events without an English version are shown in Mongolian with an "Available in Mongolian" badge.
- **Header.** The desktop menu appears from 1280 px wide; below that there's a drawer. There's one role button: visitors see "Become a member", members see "My page", admins see "Admin".

## Showing student names (`SHOW_LEADER_NAMES`)

Students' names stay hidden until the club has written consent from parents or guardians. Two switches in `src/config/site.ts` control this:

```ts
export const SHOW_LEADER_NAMES = false; // leadership cards: role + initial avatar only
export const SHOW_MEMBER_NAMES = false; // /members: aggregate numbers only
```

Set one to `true` and deploy to show names. Even then, a name is shown only if an admin has marked that person as public (Admin → Members → "Нэрийг нийтэд харуулах").

## Logo

The club has one official logo (globe with 130, hands, children, laurel, book, ribbon). The kit
lives in `public/brand/`; every SVG has a transparent background and real cut-outs, so nothing
goes behind it. Use the files as they are: no redrawing, recolouring, stretching or effects.

| File                                                         | Used for                                                                                                                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logo-horizontal-{mn,en}-{light,dark}.svg`                   | header from `lg` up (44 px tall); `/en` uses `en`                                                                                                                 |
| `logo-compact-{mn,en}-{light,dark}.svg`                      | header below `lg` (32 px tall)                                                                                                                                    |
| `logo-stacked-{light,dark}.svg`                              | footer (120 px), sign-in, `/join` visitor card and `/me` empty state (140 px), certificate (light file, 112 px)                                                   |
| `logo-mark-{light,dark}.svg`                                 | admin sidebar (40 px, mark only when collapsed), 404 + error pages (120 px), admin loading (56 px), empty list states (64 px), Clerk card (`logo-mark-light.svg`) |
| `logo-stacked-white.svg`, `logo-*-mono.svg`                  | on photos / coloured bands; print                                                                                                                                 |
| `favicon.svg` (= the mark) + `favicon-32/48/180/192/512.png` | favicon (SVG + 32 px fallback), apple-touch-icon (180), manifest icons (192, 512)                                                                                 |
| `app-icon-1024.png`, `avatar-1080.png`                       | not used by the site: social media profile / app stores                                                                                                           |
| `logo-stacked-light-1200.png`                                | source of the share images (`bun run brand:assets`)                                                                                                               |

In code, use `BrandLockup` (server components; picks the `mn`/`en` file from the locale) or
`BrandLogo` (anywhere, locale passed in) from `src/components/brand/`. Both theme files are
rendered and CSS shows the right one (`dark:hidden` / `hidden dark:block`), with fixed `width` and
`height` (no layout shift). Alt text is the club name, or empty when the same name is visible
next to the logo.

**Swapping a file:** replace it in `public/brand/` with the same file name (same artboard; if the
proportions change, update `RATIO` in `src/components/brand/brand-logo.tsx` from the new
`viewBox`). Then run `bun run brand:assets` (rebuilds `public/og-default.png`,
`public/og-default-en.png` and `public/favicon.ico`), check, and deploy. Browsers may keep the old
file for up to a day (`public/_headers`).

The school's own logo is separate: Admin → Site settings → «130-р сургуулийн лого». It appears
small on the About page only.
