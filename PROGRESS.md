# PROGRESS — 130 UNICEF club website

## Next step

**Phase 3 — Database**: install drizzle-orm + drizzle-kit, write the schema in `src/db/schema.ts`
(match types in `src/lib/types.ts`), generate migrations into `drizzle/migrations`, apply with
`wrangler d1 migrations apply DB --local`, then a seed script that reuses `src/lib/mock/*`.

**Current phase:** Phase 3 (Phases 0–2 done)

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

### Phase 3 — Database

- [ ] Drizzle schema (users/sessions, news, events, members, albums, images, applications, contact_messages, settings)
- [ ] drizzle-kit migrations → `drizzle/migrations`, applied with `wrangler d1 migrations apply --local`
- [ ] Seed script with sample Mongolian content (local D1)

### Phase 4 — Auth & admin shell

- [ ] Better Auth (Drizzle/D1), email+password, roles admin/editor, no public sign-up
- [ ] Login page, protected `/admin` layout, role guards in Server Actions
- [ ] First-admin seed script (local)

### Phase 5 — Admin CRUD

- [ ] News (Tiptap, draft/published, Cyrillic→Latin slugs)
- [ ] Events
- [ ] Members
- [ ] Site settings
- [ ] Users (create/disable)
- [ ] Switch public pages from mock data to D1

### Phase 6 — Forms

- [ ] Join form + contact form (zod + RHF, server validation)
- [ ] Turnstile (test keys fallback)
- [ ] D1 storage
- [ ] Google Sheets sync (skipped with log if not configured) + email hook
- [ ] Admin applications view (status filter, notes, CSV export, synced indicator), contact messages

### Phase 7 — Media

- [ ] R2 uploads (size/type validation), image delivery strategy for Workers
- [ ] Gallery albums admin (multi-upload, reorder, delete) + public lightbox

### Phase 8 — Quality

- [ ] SEO (metadata, OG images, sitemap.ts, robots.ts, JSON-LD Organization)
- [ ] Accessibility pass
- [ ] Performance (Lighthouse ≥ 90 mobile)
- [ ] Error / loading states
- [ ] Tests for Server Actions + validation

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

## Open questions (for the developer)

- Logo files: please put `public/logos/school-130.png` and `public/logos/unicef.png` (placeholder boxes until then).
- Real contact details (address, phone, email), social links, and a map location for `/contact`.
- Real leadership/member names, roles, classes and photos (with consent) for `/members`.

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
