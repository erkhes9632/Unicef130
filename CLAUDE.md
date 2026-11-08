# CLAUDE.md — 130 UNICEF club website

Website for the **130 UNICEF клуб** of School No. 130 (130-р сургууль), Ulaanbaatar. Founded 2025.

> **Start of every session:** read this file and `PROGRESS.md`, then continue from the first
> unfinished item in PROGRESS.md. Do not redo finished work. Also read `AGENTS.md` (Next.js rules).

## Hard rules — local only (decided by the developer, 2026-11-08)

These override everything else, including older instructions:

1. **Never deploy.** Do not run `wrangler deploy`, `bun run deploy`, `bun run upload`,
   `opennextjs-cloudflare deploy/upload`, or anything that publishes a Worker.
2. **Never `git push`**, never add git remotes, never create GitHub repos. Local commits only.
3. **No remote Cloudflare actions.** No `wrangler login`, `d1 create`, `r2 bucket create`,
   `wrangler secret put`, no `--remote` flags. Only local emulation (`wrangler dev`,
   `opennextjs-cloudflare preview`, `wrangler d1 ... --local`).
4. **External services degrade gracefully.** If Google Sheets / Turnstile keys are missing, the app
   still runs: Turnstile uses Cloudflare's official test keys, Sheets sync is skipped with a log line.
5. **Phase 10 = deploy-ready, not deployed.** Write the commands the developer will run themselves in
   `README.md` and `DEPLOY_CHECKLIST.md`.
6. **Never commit secrets.** Local secrets live in `.dev.vars` (gitignored); keep `.dev.vars.example`
   up to date. Production secrets are set by the developer via `wrangler secret put` (documented only).

## Communication

- Talk to the developer in **Mongolian** (Latin transliteration is fine).
- Code, comments, commit messages: **English**.
- Website UI text: **Mongolian (Cyrillic)** by default; all strings in `messages/mn.json` and
  `messages/en.json` (next-intl). Admin UI may be Mongolian only.
- Stop and ask (in Mongolian) for: secrets that can't be generated (Google service account, Sheet ID,
  real Turnstile keys), real content (photos, names, contacts), or any stack change.

## Fixed stack (do not change without asking)

| Area       | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| Runtime/PM | **Bun** (`bun`, `bunx`). Never npm / yarn / pnpm.                    |
| Framework  | Next.js 16 (App Router, TS strict, Server Components + Actions)      |
| UI         | Tailwind CSS v4 + shadcn/ui (radix, nova), lucide-react, next-themes |
| Hosting    | Cloudflare Workers via `@opennextjs/cloudflare` + wrangler           |
| DB         | Cloudflare D1 + Drizzle ORM / drizzle-kit                            |
| Files      | Cloudflare R2 (binding `MEDIA`)                                      |
| Auth       | Better Auth (Drizzle/D1 adapter), email+password, roles admin/editor |
| i18n       | next-intl, locales `mn` (default) + `en`                             |
| Forms      | zod + react-hook-form, re-validated on the server                    |
| Spam       | Cloudflare Turnstile on all public forms                             |
| Rich text  | Tiptap (JSON stored, rendered safely)                                |
| Sheets     | Sheets REST API via fetch + Web Crypto JWT (no `googleapis`)         |

Everything must run on the **Workers runtime**: no Node-only APIs at runtime, no filesystem writes.

## Commands

```bash
bun install
bun run dev           # next dev (bindings emulated via initOpenNextCloudflareForDev)
bun run lint          # eslint
bun run typecheck     # next typegen && tsc --noEmit
bun run format        # prettier --write .
bun run check         # lint + typecheck + format:check + bun test
bun run test          # bun test (tests/)
bun run build         # next build
bun run cf:build      # OpenNext Worker bundle (.open-next/)
bun run preview       # cf:build + local workerd preview (LOCAL ONLY — allowed)
bun run cf-typegen    # regenerate cloudflare-env.d.ts after editing wrangler.jsonc
# bun run deploy / upload  → FORBIDDEN for the agent (developer runs them manually)
```

Before marking a phase done: `bun run lint && bun run typecheck && bun run build` (and `cf:build`).

## Conventions

- Source in `src/`, alias `@/*` → `src/*`. UI primitives in `src/components/ui` (shadcn).
- Brand colors are defined **once** as CSS variables in `src/app/globals.css` (Phase 1).
- Cloudflare bindings: `getCloudflareContext()` from `@opennextjs/cloudflare`; types in
  `cloudflare-env.d.ts` (`CloudflareEnv`), regenerate with `bun run cf-typegen`.
- Every Server Action checks auth + role on the server, and re-validates input with zod.
- Minors use the site: collect only the join-form fields listed in the spec, nothing more.
- Placeholder content that the developer must confirm is marked `TODO(content):` and listed in
  PROGRESS.md. Deploy-time placeholders are marked `TODO(deploy):`.
- Respect `prefers-reduced-motion`; mobile-first; WCAG AA contrast.
- Logos: only use `public/logos/school-130.png` and `public/logos/unicef.png` provided by the
  developer. Never draw/generate logos; show a placeholder box until the files exist.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…), one per completed task,
  with the attribution line. Update PROGRESS.md in the same commit.
- `next.config.ts`: `cacheComponents` is intentionally **off** (hangs on workerd, see PROGRESS.md).
- Dates: never use `Intl` for Mongolian (workerd has no `mn` data) — use `src/lib/dates/format.ts`.
- Pages read data only through `src/lib/data/*` (locale-resolved). Admin writes go through Server
  Actions in `src/app/admin/(panel)/*/actions.ts` that start with `requireRole()`.
- Don't add `loading.tsx` to public `[locale]` routes (breaks 404 status codes).
- Visual/a11y/perf checks: run puppeteer-core / axe-core / lighthouse from a scratch folder against
  `bun run preview`; don't add them as project dependencies.
