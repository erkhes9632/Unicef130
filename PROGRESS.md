# PROGRESS — 130 UNICEF club website

## Next step

**Phase 1 — Design system & layout**: start with theme tokens (brand colors as CSS variables in
`src/app/globals.css`, dark variants, AA contrast check), then fonts (Montserrat + Nunito Sans,
`latin` + `cyrillic`).

**Current phase:** Phase 1 (Phase 0 done)

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

### Phase 1 — Design system & layout

- [ ] Brand color tokens (+ dark mode), WCAG AA check
- [ ] Fonts (Montserrat headings, Nunito Sans body, cyrillic)
- [ ] next-intl wiring (`mn` default, `en`), `messages/mn.json`, `messages/en.json`
- [ ] ThemeProvider + dark-mode toggle
- [ ] Header (both logos / placeholder boxes, nav, mobile menu, language switcher)
- [ ] Footer (logos, social links, contact)
- [ ] Base components (Section, Container, cards, badges…)

### Phase 2 — Public pages (static, mock data in `src/lib/mock/*`)

- [ ] `/` home
- [ ] `/about`
- [ ] `/news`, `/news/[slug]`
- [ ] `/events`, `/events/[slug]`
- [ ] `/members`
- [ ] `/gallery`, `/gallery/[album]`
- [ ] `/join` (UI only)
- [ ] `/contact` (UI only)
- [ ] `/support`
- [ ] Search, 404 page

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

## Open questions (for the developer)

- Logo files: please put `public/logos/school-130.png` and `public/logos/unicef.png` (placeholder boxes until then).
- Real contact details (address, phone, email), social links, and a map location for `/contact`.
- Real leadership/member names, roles, classes and photos (with consent) for `/members`.

## TODO(content)

- (none in code yet — hello-world page only)

## Known bugs

- None.
