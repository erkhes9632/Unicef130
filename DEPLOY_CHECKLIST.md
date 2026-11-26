# DEPLOY_CHECKLIST — Production

Production: **https://130foreverychild.site** (Cloudflare Workers, гараар deploy). Тайлбар,
командууд: [README.md](./README.md#production). Тэмдэглэгээ: ✅ хийсэн · ☐ хийх.

## Анхны тохиргоо (2026-11-20 дууссан)

- ✅ Cloudflare: Worker `unicef-club-130`, D1 `unicef-club-130-db` (APAC), R2
  `unicef-club-130-media` + `unicef-club-130-opennext-cache`. Автомат deploy (CI) **байхгүй**.
- ✅ Домэйн `130foreverychild.site` Cloudflare-д (Active); Worker-ийн custom domain
  (`wrangler.jsonc` → `routes`). `workers.dev` хаяг унтраалттай.
- ✅ Clerk Production instance: домэйний DNS бичлэгүүд Verified (DNS only), Email code + Google
  (өөрийн OAuth credential, consent screen Published), session token
  `{"role": "{{user.public_metadata.role}}"}`, bot sign-up protection ON, webhook
  `https://130foreverychild.site/api/webhooks/clerk` (`user.created`, `user.updated`,
  `user.deleted`).
- ✅ Turnstile widget: hostname `130foreverychild.site` — 2026-11-26-ны хувилбараас хойш ашиглахгүй
  (contact form хасагдсан): доорх «Энэ хувилбарын deploy-ийн дараа»-г үзнэ үү.
- ✅ `wrangler.jsonc` vars: `SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live), `TURNSTILE_SITE_KEY`.
- ✅ Secret-ууд: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`.
- ✅ Нөөц `private/backup-before-clerk-2026-11-20.sql` → migration 0000–0008 → deploy.
- ✅ Нийтийн хуудсууд 200, буруу хаяг 404, `/admin` ба `/me` нэвтрээгүй үед → `/sign-in`, security
  header-үүд (CSP, HSTS, X-Frame-Options), sitemap/robots/canonical шинэ домэйнтэй.

### Үлдсэн (developer)

- ☐ Анхны админ: сайтад нэвтэрсний дараа `bun run admin:grant -- <и-мэйл>` (README → «Админ болох»).
- ☐ Clerk → Webhooks → endpoint → Testing → `user.created` илгээх → Attempts **200**.
- ☐ Хуучин нэвтрэлтийн secret-ийг устгах: `bunx wrangler secret delete BETTER_AUTH_SECRET`.
- ☐ Cloudflare болон Clerk-д 2 дахь хариуцагчийг (хариуцсан багш) нэмэх.
- ☐ Web Analytics + статистик (заавал биш, үнэгүй): README → «Analytics» (site tag, API token,
  `CF_ACCOUNT_ID` → `wrangler secret put` 3 удаа).
- ☐ Контент (PRODUCTION_REPORT §6): лого, холбоо барих, сошиал, зураг, гишүүдийн зөвшөөрөл.
- ☐ Google Cloud → OAuth consent screen → Privacy policy URL: `https://130foreverychild.site/privacy`
  (бөглөөгүй бол).
- ☐ Google Search Console-д `https://130foreverychild.site/sitemap.xml` (заавал биш).

## Найдвартай байдлын засварын deploy (2026-11-26, 2-р удаа)

1. ☐ Нөөц: `bunx wrangler d1 export DB --remote --output private/backups/before-fix-$(date +%F-%H%M).sql`
2. ☐ Migration шаардлагагүй (шинэ migration алга): `bunx wrangler d1 migrations list DB --remote`
   хоосон байх ёстой.
3. ☐ `bun run deploy` (build → deploy → `cache:warm`, хуудас хооронд 1 сек).
4. ☐ Цомгийн хуучин хаяг: `bunx wrangler d1 execute DB --remote --file private/sql/2026-11-26-album-redirect.sql`
   → `/gallery/mod-tarikh-ajillagaa-2026` 308 болохыг шалгах.
5. ☐ `bunx wrangler tail --format pretty --status error` 2 минут: `TypeError ... 'includes'`,
   `revalidation ... failed` гарах ёсгүй.

## Contact/профайл хувилбарын deploy (2026-11-26)

1. ☐ Нөөц: `bunx wrangler d1 export DB --remote --output private/backups/before-profile-$(date +%F-%H%M).sql`
2. ☐ `bun run db:migrate:remote` — 0011: users (овог, нэр, анги, `profile_updated_at`), members
   (зөвшөөрлийн огноо/админ), impact_stats (тайлангийн 115 / 52 / 734), хайлтын NOCASE index,
   contact default (и-мэйл, Instagram, хаяг — хоосон бол л), FAQ 8 ноорог (нийтлэгдээгүй).
3. ☐ `bun run deploy`.
4. ☐ Шалгах: footer-ийн «Холбоо барих», `/support`, `/contact` → `/#contact`, `/members` (52),
   `/admin` (хийх зүйлс, статистик), Админ → Хэрэглэгчид → «Нэр засах», `/me` → «Миний мэдээлэл».
5. ☐ Deploy-ийн дараа устгах (Cloudflare dashboard): `bunx wrangler secret delete TURNSTILE_SECRET_KEY`;
   Turnstile → `130foreverychild.site` widget → Delete.
6. ☐ Админ → Түгээмэл асуулт: 8 ноорог асуултыг шалгаж нийтлэх. Админ → «Дэмжих хуудас»: текстийг
   клубтэй баталгаажуулах.

## Энэ хувилбарын анхны deploy (кэш + статистик, 2026-11)

1. ☐ Нөөц: `bunx wrangler d1 export DB --remote --output private/backups/before-cache-$(date +%F-%H%M).sql`
2. ☐ `bun run db:migrate:remote` (0010 = кэшийн `revalidations` хүснэгт; зөвхөн нэмнэ).
3. ☐ Зургийн 960 px хувилбар: `bun scripts/report/run-import.ts --remote --dry-run` → зөвхөн
   `-md.webp` upload гарах ёстой → `--remote --confirm-production` (DB өөрчлөгдөхгүй, idempotent).
   **Deploy-оос өмнө** хийнэ: шинэ код `srcset`-д 960 px файлыг заадаг.
4. ☐ `bun run deploy` (Durable Object `DOQueueHandler`-ийн migration автоматаар; дараа нь
   `cache:warm` бүх хуудсыг кэшлэнэ). Warm-up 5xx-ийг нэг удаа дахин оролдоно; үлдсэн хуудсуудыг
   жагсааж хэвлэнэ (exit 0) — тэр үед `bunx wrangler tail --status error` харж, `bun run cache:warm`
   дахин.
5. ☐ Шалгах: `bunx wrangler tail --format json` → нийтийн хуудсуудын `cpuTime` 1–5 ms,
   `outcome: ok`; нүүр, `/en`, мэдээ, `/join`, `/sign-in`, `/admin` (админаар).

## Энгийн deploy (код өөрчлөгдсөн үед)

- ☐ `git pull && bun install`
- ☐ `bun run check` (lint, typecheck, format, knip, тест) ногоон
- ☐ Нэвтрэлт/эрхэд хүрсэн бол: `bun run preview` + `bun run test:e2e`
- ☐ `bunx wrangler d1 migrations list DB --remote` — шинэ migration байвал доорх хэсэг
- ☐ `bun run deploy` (build → deploy → `cache:warm`)
- ☐ Шалгах: нүүр, `/en`, `/join`, `/sign-in`, `/admin` (админаар) + `bunx wrangler tail --status error`
  хэдэн минут

## Шинэ migration

- ☐ `src/db/schema.ts` → `bun run db:generate` → SQL-ийг уншиж шалгана
- ☐ `bun run db:migrate:local` → локалд `bun run preview` + тест
- ☐ Нөөц: `bunx wrangler d1 export DB --remote --output private/backup-$(date +%F).sql`
- ☐ `bun run db:migrate:remote` → шууд `bun run deploy` (хооронд нь удаахгүй)
- ☐ Багана/хүснэгт **устгах** migration: шинэ код deploy хийгдэж, хуучин код түүнийг ашиглахаа
  больсны дараа тусдаа ажиллуулна
- ☐ Асуудал гарвал: `bunx wrangler d1 time-travel restore DB --timestamp=<migration-ий өмнөх цаг>`
  - өмнөх commit-оос `bun run deploy`

## Secret солих

README → «Secret-ууд ба тэдгээрийг солих». Шинэ утга үүсгэх → `bunx wrangler secret put <НЭР>` →
шалгах → хуучныг устгах.

## Google Sheets sync (заавал биш)

1. Google Cloud → шинэ project → **Google Sheets API** идэвхжүүлэх → Service account → Keys → JSON.
2. Sheet үүсгэж service account-ын и-мэйлд **Editor** эрхээр share хийнэ; tab `Applications`.
3. `bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL` · `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   (JSON-ийн `private_key`) · `GOOGLE_SHEET_ID`. JSON файлыг устгана.
4. Админ → Өргөдлүүд дээр «Sheets-д илгээх» идэвхжинэ. `/privacy` дээр Sheets-ийн мөр автоматаар
   гарна.
