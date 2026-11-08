# PROGRESS — 130 UNICEF club website

## Next step

**Phase 9 — English**: review/complete `messages/en.json` (natural English for all public UI),
English fields for the seeded sample content (already present in mock data), check `/en/*` pages
render fully in English, keep key parity test.

**Current phase:** Phase 9 (Phases 0–8 done)

Local test accounts (LOCAL D1 only, created with `bun run admin:create`):
`admin@example.com` / `LocalTest-Pass-123` (admin), `editor@example.com` / `LocalEditor-Pass-123` (editor).

---

## Checklist

### Phase 0 — Setup ✅

- [x] Next.js 16.4.5 app via `bunx create-next-app` (TS strict, App Router, Tailwind v4, ESLint, `src/`)
- [x] Own git repo (`git init`, branch `main`, no remote)
- [x] Prettier (+ tailwind plugin) and `eslint-config-prettier`
- [x] shadcn/ui init (radix base, nova preset), lucide-react, next-themes installed
- [x] OpenNext Cloudflare: `open-next.config.ts` (R2 incremental cache), `wrangler.jsonc`
      with placeholder D1/R2 IDs, `public/_headers`, scripts, `cloudflare-env.d.ts`
- [x] `.dev.vars.example` + gitignored `.dev.vars`
- [x] Hello-world page; verified `bun run dev` and local Workers preview (`opennextjs-cloudflare preview`)
- [x] lint, typecheck, `next build`, `cf:build` pass
- [x] CLAUDE.md + PROGRESS.md

### Phase 1 — Design system & layout ✅

- [x] Brand color tokens (+ dark mode), WCAG AA check (all in `src/app/globals.css` → "BRAND PALETTE")
- [x] Fonts (Montserrat headings, Nunito Sans body, cyrillic) — `src/app/fonts.ts`
- [x] next-intl wiring (`mn` default no prefix, `/en/...`), `messages/mn.json`, `messages/en.json`, typed messages (`src/global.d.ts`)
- [x] ThemeProvider + dark-mode toggle (light/dark/system)
- [x] Header (logo lockup w/ placeholder boxes, nav, search, language switcher, theme toggle, CTA, mobile sheet menu)
- [x] Footer (logos, nav, contact, socials, brand stripe, disclaimer)
- [x] Base components: Section/SectionHeading/Eyebrow, PageHero, DecorativeShapes, EmptyState, shadcn ui set
- [x] 404 pages (`[locale]/not-found.tsx` via catch-all, root `not-found.tsx`)

### Phase 2 — Public pages (static, mock data in `src/lib/mock/*`) ✅

- [x] Types (`src/lib/types.ts`), mock data (`src/lib/mock/*`), data layer (`src/lib/data/*`, locale-resolved, D1-ready signatures)
- [x] `/` home (hero with both logos, stats, what we do, latest news, upcoming events, gallery preview, partners/social, CTA)
- [x] `/about` (story, mission, values, inside/outside, leadership)
- [x] `/news` (category chips, ?page pagination), `/news/[slug]` (cover, safe rich text, tags, share, related)
- [x] `/events` (list upcoming/past + month calendar via ?view=calendar&month=YYYY-MM), `/events/[slug]` (+ .ics at `/api/events/[slug]/ics`)
- [x] `/members` (leadership + members, initials avatars, photos only with consent)
- [x] `/gallery`, `/gallery/[album]` (masonry grid + lightbox with keyboard/swipe)
- [x] `/join` form (RHF + zod, server re-validation; storage stub until Phase 6)
- [x] `/contact` (info, socials, Google Maps embed allow-list, contact form)
- [x] `/support` (ways to help, configurable donation link)
- [x] `/search?q=` (news + events), 404 page

### Phase 3 — Database ✅

- [x] Drizzle schema `src/db/schema.ts`: Better Auth tables (user/session/account/verification + admin fields), news, events, members, albums, images, applications, contact_messages, settings, activity_log
- [x] `drizzle/migrations/0000_*.sql` via `bun run db:generate`; applied with `bun run db:migrate:local`
- [x] `src/db/index.ts` → `getDb()` (D1 binding via getCloudflareContext)
- [x] `bun run db:seed:local` (scripts/seed.ts, reuses mock data + default settings); `bun run db:reset:local`

### Phase 4 — Auth & admin shell ✅

- [x] Better Auth (`src/lib/auth/index.ts`): drizzle adapter, email+password, sign-up disabled, roles via `user.role`, disabled users blocked in `databaseHooks.session.create.before`, `nextCookies()`
- [x] `/api/auth/[...all]` handler; trusted origins from `BETTER_AUTH_TRUSTED_ORIGINS`
- [x] PBKDF2 (Web Crypto) password hashing (`src/lib/auth/password.ts`)
- [x] `/admin/login` (server action), protected `/admin/(panel)` layout, sidebar + mobile menu, logout, dashboard (counts, recent activity, new applications)
- [x] Guards: `requireUser()` for pages, `requireRole()` for Server Actions (`src/lib/auth/session.ts`), `logActivity()`
- [x] `bun run admin:create -- --email ... [--password ...] [--role admin|editor] [--reset] [--print-sql]` (local D1)
- [x] Verified on local workerd: sign-up disabled, 401 wrong password, login 200, /admin redirect when signed out, editor can't see admin-only nav, CSRF origin check 403, sign-in rate limit 429

### Phase 5 — Admin CRUD ✅

- [x] Shared: `ActionState` + `actionError()` (`src/lib/admin/action-state.ts`), admin form controls, Tiptap editor (JSON in hidden input), slug field (Cyrillic→Latin `src/lib/slug.ts`), confirm dialog, UB datetime-local helpers
- [x] News CRUD (draft/published, scheduled publish date, category, tags, cover URL field, EN fields)
- [x] Events CRUD (start/end in UB time, location, published flag, EN fields)
- [x] Members CRUD (group, class, order, photo + "show publicly" consent toggle, active)
- [x] Site settings (admin only): contact, map embed (Google only), socials, stats, donation link
- [x] Users (admin only): create with generated one-time password, change role, disable/enable (sessions revoked), reset password; can't lock yourself out; ≥1 active admin
- [x] Public data layer switched from mock → D1 (`src/lib/data/*`)
- [x] Verified on local workerd via no-JS form posts: create/validate news, XSS escaped, editor blocked from admin-only action server-side, anonymous action → login, settings reflected on site, user creation + login, disabled user's existing session rejected

### Phase 6 — Forms ✅

- [x] Join + contact forms: RHF + zod on the client, re-validated in Server Actions (`src/app/actions/forms.ts`)
- [x] Turnstile widget (`components/forms/turnstile.tsx`, explicit render, remount to reset) + Siteverify (`lib/integrations/turnstile.ts`); site key passed at runtime; test keys fallback
- [x] D1 storage (phone normalized to +976…, class to "10А", consent timestamp)
- [x] Google Sheets sync via service-account JWT (Web Crypto RS256) + Sheets REST append (RAW, no formula eval); runs in `waitUntil`; result stored (`sheets_synced_at` / `sheets_error`); skipped with log when not configured
- [x] Notification hook (`lib/integrations/notifications.ts`, no-op)
- [x] Admin applications: status tabs with counts, status select, notes, synced indicator, retry sync, CSV export (BOM, formula-injection guard), delete (admin only)
- [x] Admin contact messages: filter, mark read/unread, delete (admin only)
- [x] Verified on local workerd: valid join → stored + sheets skipped log; missing token → captcha; invalid → field errors; contact stored; CSV export OK; anon export 401; JWT signature verified with a local RSA key

### Phase 7 — Media ✅

- [x] `POST /api/admin/upload` (editor+, same-origin check, 5MB limit, magic-byte type sniffing, keys `<kind>/<yyyy>/<mm>/<uuid>[-thumb].<ext>`) → R2 `MEDIA`
- [x] `GET /media/[...key]` (R2 → immutable cache, ETag/304, nosniff, path validation)
- [x] Browser-side resize/re-encode (`src/lib/media/client.ts`: WebP w/ JPEG fallback, 1920px full + 640px thumb, strips EXIF/GPS)
- [x] `ImageField` uploader for news/events/members; old R2 objects deleted when replaced or when the record is deleted
- [x] Gallery admin: albums CRUD, multi-upload with progress, alt text, reorder (up/down), set cover, delete image/album (+R2 cleanup)
- [x] Public gallery already uses the lightbox (Phase 2) with thumbs/full URLs from D1
- [x] Verified on local workerd: upload OK + byte-identical fetch, 304 with ETag, fake image rejected, bad kind 400, anon 401, bad origin 403, traversal 404, replaced cover removed from R2

### Phase 8 — Quality ✅

- [x] SEO: `pageMetadata()` (canonical + hreflang mn/en/x-default, OG/Twitter), runtime site URL (`SITE_URL` → request host), `public/og-default.png` (source `scripts/og/og-default.html`), dynamic `sitemap.xml` from D1, `robots.txt`, JSON-LD Organization / NewsArticle / Event
- [x] Accessibility: axe-core (WCAG 2.1 AA + best practices) on 13 public pages × light/dark → 0 violations after fixes (heading order, calendar dots role, event `dl` structure); Lighthouse a11y 100
- [x] Mobile QA with real device emulation (390px): no horizontal overflow; header simplified on phones (search moved into menu); inputs 40px tall
- [x] Performance: fixed `__name is not defined` inline-script error (wrangler `keep_names: false`), trimmed client i18n messages, variable Montserrat, no fade-in on LCP text. Lighthouse mobile (local workerd + gzip proxy): devtools throttling 99 on /, /news, /events; simulated throttling 85–97 (see Known bugs)
- [x] `loading.tsx` / `error.tsx` for public and admin, `global-error.tsx`
- [x] Tests: `bun test` — 43 tests (slug, form + admin schemas, rich-text XSS, csv, UB dates, ics, roles, PBKDF2, image sniffing, Sheets JWT, Server Action role guards + public form actions with mocks)

### Phase 9 — English

- [ ] Fill `messages/en.json` + English content fields

### Phase 10 — Deploy-ready & handover (NO actual deploy)

- [ ] Production build passes
- [ ] README.md (Mongolian): local run, D1/R2/secrets creation commands, migrations, deploy, custom domain, first admin, adding news, handover
- [ ] DEPLOY_CHECKLIST.md

---

## Decisions

| Date       | Decision                                                                                                                                                 | Reason                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-08 | **Local only: never deploy** (no `wrangler deploy`, `opennextjs-cloudflare deploy/upload`). Phase 0 hello-world deploy skipped; local preview is enough. | Developer instruction.                                                                                                                                                |
| 2026-11-08 | **Never `git push`**, no remotes, no GitHub repos. Local commits only.                                                                                   | Developer instruction.                                                                                                                                                |
| 2026-11-08 | **No remote Cloudflare actions** (no `wrangler login`, `d1 create`, `r2 bucket create`, `secret put`, `--remote`). Local D1/R2 emulation only.           | Developer instruction.                                                                                                                                                |
| 2026-11-08 | Google Sheets / Turnstile must degrade gracefully when keys are missing (Turnstile test keys; Sheets sync skipped with a log line).                      | Developer instruction.                                                                                                                                                |
| 2026-11-08 | Phase 10 writes deploy commands into README.md + DEPLOY_CHECKLIST.md for the developer to run; the agent never runs them.                                | Developer instruction.                                                                                                                                                |
| 2026-11-08 | Project is its own git repo inside `~/Documents/My projects/Projects/` (the parent `~/Documents` is also a repo; this folder is untracked there).        | Keep history independent from unrelated projects.                                                                                                                     |
| 2026-11-08 | `cacheComponents` / `partialPrefetching` disabled in `next.config.ts`.                                                                                   | With them on, the Worker hung on workerd (500 "code had hung"; Next warns its Cache Components need a different `setTimeout`). Re-evaluate when OpenNext supports it. |
| 2026-11-08 | `wrangler.jsonc` has placeholder D1 id `00000000-…` and R2 bucket names; marked `TODO(deploy)`.                                                          | Local emulation doesn't need real IDs; developer fills them before deploy.                                                                                            |
| 2026-11-08 | OpenNext R2 incremental cache enabled (binding `NEXT_INC_CACHE_R2_BUCKET`) + `WORKER_SELF_REFERENCE`.                                                    | Recommended OpenNext setup; works locally.                                                                                                                            |
| 2026-11-08 | shadcn/ui: radix base, "nova" preset; uses the `cn` package (shadcn-ui/cn) instead of clsx+tailwind-merge.                                               | Current shadcn default.                                                                                                                                               |
| 2026-11-08 | `cloudflare-env.d.ts` (generated by `wrangler types`) is committed.                                                                                      | Typecheck works without running typegen first.                                                                                                                        |
| 2026-11-08 | Trusted postinstalls: `esbuild`, `workerd` (`bun pm trust`).                                                                                             | Needed to download their native binaries for builds/preview.                                                                                                          |

| 2026-11-08 | i18n uses deprecated-but-supported **edge `src/middleware.ts`** (not Next 16 `proxy.ts`). | `proxy.ts` runs on Node runtime, which OpenNext Cloudflare marks experimental/unmaintained. Revisit when OpenNext supports it. |
| 2026-11-08 | `localePrefix: "as-needed"`, `localeDetection: false`. | Mongolian URLs stay clean (`/about`); English under `/en`. Audience is Mongolian, so no browser-language redirects. |
| 2026-11-08 | Single root layout (`app/layout.tsx`, `lang` from `getLocale()`) shared by `[locale]` and `/admin`. Pages are dynamic (SSR). | Simpler than multiple root layouts; content comes from D1 anyway. |
| 2026-11-08 | `images.unoptimized: true`; image strategy = resize/compress in the browser before upload (WebP, max ~1920px + thumbnail), serve from R2. | Next image optimizer needs the paid/remote Cloudflare Images binding on Workers; this is free and works locally. |
| 2026-11-08 | Text-safe brand variants (`--brand-*-strong`) for text; raw brand colors for fills/decoration; primary button = cyan + navy text. | Raw cyan/green/gold on white fail WCAG AA (1.9–2.6:1). |
| 2026-11-08 | Desktop nav from `xl` (1280px); mobile sheet menu below. | 8 nav items + logos + actions don't fit at `lg`. |
| 2026-11-08 | Social icon SVG paths copied locally from simple-icons (CC0); package not installed. | Avoid shipping the whole icon set in the Worker bundle. lucide v1 has no brand icons. |
| 2026-11-08 | Logos rendered by `LogoImage` with automatic placeholder box when the file 404s. | Developer adds the files later; no code change needed. |
| 2026-11-08 | Not trusted: `@parcel/watcher`, `@swc/core` postinstalls (next-intl extractor deps). | Not needed for our usage. |

| 2026-11-08 | Own Mongolian date formatter (`src/lib/dates/format.ts`), no `Intl` for `mn`. | workerd's ICU has no Mongolian data → `Intl` silently fell back to English on Workers (Node was fine). |
| 2026-11-08 | Rich text rendered by an allow-list React renderer (`components/common/rich-text.tsx`), never `dangerouslySetInnerHTML`; URL allow-list (http/https/mailto/tel/relative). | Safe rendering of admin-authored Tiptap JSON. |
| 2026-11-08 | Join form: phone required, email optional (minors may not have email); helpWith is a multi-select of fixed options. | Collect only what's needed. |
| 2026-11-08 | Filters/pagination/calendar navigation use plain `?query` links and GET forms. | Works without JS, cache-friendly, simple on phones. |
| 2026-11-08 | Cover placeholders = brand gradient + category icon; gallery placeholders = generated abstract SVGs in `public/placeholders/`. | No real photos yet; no external image hosts. |

| 2026-11-08 | Migrations are generated by drizzle-kit and applied by **wrangler** (`migrations_dir`), not drizzle-kit push. | Same flow locally and in production (`--remote` documented for the developer only). |
| 2026-11-08 | Local scripts (seed, admin) generate SQL and run `wrangler d1 execute DB --local --file`. No remote option in code. | Hard rules: local only. |
| 2026-11-08 | Timestamps stored as integer ms; JSON columns for rich text, tags, helpWith, settings values. | D1/SQLite friendly, simple to read back. |
| 2026-11-08 | Images stored by URL (`/media/<key>` for R2 uploads, `/placeholders/*` for samples). | One field for both seeded and uploaded images. |

| 2026-11-08 | Roles stored in `user.role` (admin/editor) as a Better Auth additional field; Better Auth admin plugin **not** used. User management is done in our own Server Actions. | The admin plugin's role model is admin/user; ours is admin/editor. Fewer moving parts. |
| 2026-11-08 | Password hashing = PBKDF2-SHA256 100k iterations via Web Crypto instead of Better Auth's scrypt. | Pure-JS scrypt can exceed the Workers CPU limit; Web Crypto is native. |
| 2026-11-08 | Admin UI strings are Mongolian, inline in admin components (not in messages/*.json). | Spec §5: admin may be Mongolian only. Public site strings all live in messages. |
| 2026-11-08 | BETTER_AUTH_SECRET generated locally into `.dev.vars` (not committed). Production: developer runs `bunx wrangler secret put BETTER_AUTH_SECRET` with a new value from `openssl rand -base64 32`. | Never commit secrets. |

| 2026-11-08 | Admin session check bypasses Better Auth's cookie cache (`disableCookieCache`). | With the 5-min cookie cache a disabled user kept access; found in testing. |
| 2026-11-08 | Admin forms = Server Actions + `useActionState` with progressive enhancement; redirects after create. | Works without JS; one pattern for all CRUD. |
| 2026-11-08 | Search over Cyrillic done in JS over latest 500 rows. | SQLite LIKE/lower() don't fold Cyrillic case. |

| 2026-11-08 | Turnstile site key read from env at request time (`TURNSTILE_SITE_KEY`), not `NEXT_PUBLIC_*`. | Change keys with `wrangler secret/vars` without rebuilding. |
| 2026-11-08 | Sheets sync is fire-and-forget (`ctx.waitUntil`) with a retry button in admin. | The applicant never waits for / fails because of Google. |
| 2026-11-08 | Deleting applications/messages is admin-only. | Personal data of minors. |

| 2026-11-08 | Uploads go through a Route Handler (multipart), not a Server Action. | Server Action bodies are limited to 1MB by default; route handler gives explicit size/type control. |
| 2026-11-08 | Images resized in the browser; no server-side transforms. | Free, works locally, no Cloudflare Images binding; also strips GPS metadata from children's photos. |

| 2026-11-08 | `keep_names: false` in wrangler.jsonc. | esbuild's `__name` helper broke next-themes' serialized inline script in the browser. |
| 2026-11-08 | Visual/a11y/perf QA tools (puppeteer-core, axe-core, lighthouse) are run from the session scratchpad, not added to the project. | Keep project deps lean; documented commands in README for future checks. |
| 2026-11-08 | OG image is a static PNG generated from HTML (no `next/og` at runtime). | Avoids bundling satori/resvg wasm into the Worker (size limits). |

## Open questions (for the developer)

- Logo files: please put `public/logos/school-130.png` and `public/logos/unicef.png` (placeholder boxes until then).
- Real contact details (address, phone, email), social links, and a map location for `/contact`.
- Real leadership/member names, roles, classes and photos (with consent) for `/members`.
- (Not blocking) Production Turnstile keys and Google service account + Sheet ID — the app works without them locally; needed before going live (see DEPLOY_CHECKLIST.md in Phase 10).

## TODO(content)

- `src/config/site.ts`: contact (address, email, phone, map embed, office hours), social links, homepage stats, donation link — will be editable in admin (Phase 5).
- Logo files `public/logos/school-130.png`, `public/logos/unicef.png` (placeholder boxes until added).
- Footer disclaimer wording about UNICEF affiliation (`Footer.disclaimer` in messages).
- Sample news/events/members/albums in `src/lib/mock/*` (also used as seed data) — replace via admin.
- Member names in mock data are placeholders (Phase 3 seed) — real names/roles/classes needed.
- Homepage partners section: 3 placeholder boxes (real partner names/logo files).
- Event locations ("хүүхдийн асрамжийн төв") — exact places.
- About page story/mission/values text (messages `About.*`) — confirm wording.

## Known bugs

- 404 pages: HTML shell is empty and the 404 content renders from the RSC payload on the client (same with `next start`, so it's Next 16 behavior, not Workers). Status code + `noindex` are correct. Revisit in Phase 8.
- Build warns "middleware file convention is deprecated" — intentional (see Decisions).
- Console 404s for `/logos/school-130.png` and `/logos/unicef.png` until the developer adds the files (placeholders render fine). Lowers Lighthouse best-practices to 96.
- Lighthouse _simulated_ mobile score is 85 on content-heavy pages (/, /news, /members) mainly due to 6 web-font files (Montserrat + Nunito Sans × latin/cyrillic/cyrillic-ext — Mongolian Ө/Ү are in cyrillic-ext). Real-throttled runs score 99. Option if needed: `display: "optional"` for headings or self-subset fonts.
- Local preview has no gzip/brotli; Cloudflare's edge compresses in production (HTML 138 KB → ~22 KB).
