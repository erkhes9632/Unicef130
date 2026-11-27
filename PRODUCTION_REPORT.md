# Production report

**Site:** https://130foreverychild.site · **Hosting:** Cloudflare Workers, Free plan · **Deploys:** by
hand (`bun run deploy`, see `DEPLOY_CHECKLIST.md`) · **State of:** 2026-11-27 (final release round)

## Summary

- Public site in Mongolian and English, light and dark: home, about, impact, news, events,
  gallery, members, FAQ, support, search, privacy. Unknown addresses get a static 404.
- Sign-in with Clerk (Google or an e-mail code). Roles: admin, member, or none (applicant).
- Enrollment, applications, a member area (`/me`: volunteer hours, event sign-ups, certificate),
  and an admin panel for content, members by school year, hours, enrollment, users and settings.
- Everything runs on the Free plan: public pages are served from cache (about 1–5 ms of CPU);
  only account areas render per request.

## Services and configuration (names only)

| Service    | Setup                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare | Worker `unicef-club-130` on the custom domain, D1 `unicef-club-130-db`, R2 `unicef-club-130-media` and `unicef-club-130-opennext-cache`, a Durable Object for background page refreshes, daily cron 03:30 Ulaanbaatar |
| Clerk      | Production instance, Google OAuth with the club's own credentials, `role` claim in the session token, webhook `/api/webhooks/clerk`, bot protection on sign-up                                                        |
| Vars       | `SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `GOOGLE_SHEET_TAB`                                                                                                                                                   |
| Secrets    | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`; optional `CF_ANALYTICS_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_WEB_ANALYTICS_SITE_TAG`, `GOOGLE_SERVICE_ACCOUNT_*`, `GOOGLE_SHEET_ID`                                    |

## Security and privacy

- Roles are checked on the server for every page, action and route (static tests enforce it);
  the proxy only checks that account areas have a session.
- Clerk webhooks are verified (signature + 5-minute window). An admin can't remove, ban or
  delete themselves or the last admin.
- Headers: CSP (own origin, Cloudflare Web Analytics; Clerk and its bot protection only in
  account areas), HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer- and Permissions-Policy.
- Uploads: admins only, JPG/PNG/WebP checked by content, 5 MB, metadata (EXIF/GPS/XMP) removed in
  the browser and again on the server.
- Students: names are public only per school year with recorded parental consent; individual
  hours are never public; logs and the audit trail use ids; rejected applications are deleted
  90 days after enrollment closes; a deleted account keeps only anonymous hour totals.

## Quality (local Worker build with a copy of production data)

| Check         | Result                                                                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device matrix | 12 widths (320–1920) × light/dark × mn/en, 46 pages incl. admin and signed-in states (1,608 loads): 0 × 5xx, 0 horizontal scroll, 0 clipped or overlapping text on public pages, 0 images without size, 0 layout shifts > 0.1, 0 broken links |
| Accessibility | axe: no serious/critical issues outside Clerk's own development badge                                                                                                                                                                         |
| Cold cache    | every public page 200 on its first request; 300 requests in bursts of 20: 0 × 5xx                                                                                                                                                             |
| Content       | every number, date, title, partner and SDG of the 2025–2026 report matches the pages (mn + en)                                                                                                                                                |
| Lighthouse    | mobile: home 100, news 85 (first photo on slow 4G), article 100, album 89, members 100, join 97, admin 99 · desktop 100 everywhere · accessibility 100 everywhere                                                                             |

## Known limits

1. Admin 2FA isn't enforced by code (depends on the Clerk plan); Admin → Хэрэглэгчид flags
   admins without 2FA.
2. No e-mail alert for new applications: check Admin → Өргөдлүүд.
3. With Google Sheets on, deleting an application doesn't delete its sheet row.
4. Images uploaded but never saved stay in R2 (small).
5. Report photos: the 960 px versions are 80–210 kB; on a slow mobile connection the first news
   photo is the slowest part of the page. Re-encoding them at a lower quality would need a new
   upload to R2 (developer task).
6. Every public page ships the React/Next.js runtime and next-intl (about 210 kB gzip of JS).
7. The build warns "middleware → proxy": `middleware.ts` (edge) is kept on purpose for OpenNext.

## Waiting on the club

1. Start the 2026–2027 school year in the admin (leaders, members).
2. Parental consent before any student's name is shown (per year, Admin → Гишүүд).
3. Five name spellings in the report member list (`private/members-review.md`).
4. The 12th (education) activity that is counted in the 2025–2026 totals but not described.
5. Photos, logos and social accounts as they become available (Admin → Сайтын тохиргоо).
