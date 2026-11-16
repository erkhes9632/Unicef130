# DEPLOY_CHECKLIST — Production тохиргоо

Production: **https://unicef-club-130.erkhes-labs.workers.dev** (Cloudflare Workers, гараар deploy).

Бүх командыг төслийн хавтаснаас ажиллуулна. Багцын менежер нь **Bun**. Дараагийн deploy, migration,
secret, лог, домэйний заавар: [README.md → Production](./README.md#production-cloudflare-workers).

Тэмдэглэгээ: ☐ = хийх, ✅ = хийсэн.

---

## 0. Урьдчилсан бэлтгэл

- ✅ Cloudflare бүртгэлд wrangler нэвтэрсэн (`bunx wrangler whoami`).
- ✅ Локал шалгалт ногоон: `bun install`, `bun run check`, `bun run build`, `bun run cf:build`.
- ☐ Cloudflare бүртгэлд 2 дахь хүнийг (хариуцсан багш) **Member** болгон нэмэх.
- ☐ Лого файлууд: `public/logos/school-130.png`, `public/logos/unicef.png`.
- ☐ Домэйн нэр (одоохондоо `*.workers.dev` ашиглана).

## 1. Нөөцүүд

- ✅ D1 `unicef-club-130-db` (APAC) үүсгэж, `database_id`-г `wrangler.jsonc`-д тавьсан.
- ✅ R2 `unicef-club-130-media` (зураг) ба `unicef-club-130-opennext-cache` (APAC).
- ✅ Migration `0000_lush_namorita.sql` production дээр ажилласан
  (`bun run db:migrate:remote`). Хүснэгтүүд хоосон — жишээ контент, тест хэрэглэгч **байхгүй**.
  Сайтын тохиргоо хоосон үед `src/config/site.ts`-ийн fallback утга харагдана.

## 2. Тохиргоо (`wrangler.jsonc` → `"vars"`)

- ✅ `SITE_URL` = workers.dev URL (домэйн холбоход 7f-ийн дагуу солино).
- ☐ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk production instance (7f).
- ✅ `GOOGLE_SHEET_TAB` = `Applications`.
- ☐ `TURNSTILE_SITE_KEY` — Turnstile widget үүсгэсний дараа (доорх 3-р алхам).

## 3. Нууц утгууд

- ☐ `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` — Clerk production instance (7f).
- ☐ `TURNSTILE_SECRET_KEY`:
  1. Dashboard → **Turnstile** → **Add widget**.
  2. Widget name: `unicef-club-130`; Hostname: `unicef-club-130.erkhes-labs.workers.dev`.
  3. Widget mode: **Managed** → Create.
  4. **Site key**-г `wrangler.jsonc` → `TURNSTILE_SITE_KEY`-д бичнэ (нийтэд ил утга).
  5. **Secret key**: `bunx wrangler secret put TURNSTILE_SECRET_KEY` → терминал асуухад оруулна.
  6. `bun run deploy`.
- ➖ Google Sheets (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
  `GOOGLE_SHEET_ID`) — одоохондоо ашиглахгүй. Байхгүй үед өргөдөл D1-д хадгалагдаж, sync чимээгүй
  алгасагдана. Дараа нь хэрэгтэй бол доорх "Google Sheets" хэсгийг үзнэ.

## 4. Deploy

- ✅ `bun run deploy` → `https://unicef-club-130.erkhes-labs.workers.dev`.
- ✅ Автомат deploy (Workers Builds, GitHub Actions) **тохируулаагүй** — зориуд гараар.
- ☐ **Plan:** Workers Free нь хүсэлт бүрт 10 ms CPU хязгаартай. Хүнд хуудсууд Error 1102 өгвөл
  **Workers Paid** ($5/сар) руу шилжинэ.

## 5. Эхний админ

- ☐ Clerk-ээр (7f): сайтад нэг удаа нэвтэрч, дараа нь `bun run admin:grant -- <таны-и-мэйл>`.

## 6. Smoke test

- ✅ Бүх нийтийн хуудас (mn + en) 200, `sitemap.xml`, `robots.txt` зөв домэйнтэй.
- ✅ Байхгүй хуудас 404, 500 алдаа байхгүй.
- ☐ Нэвтрээгүй үед `/admin` → `/sign-in?redirect_url=…` (307).
- ☐ Нэвтэрсний дараа: мэдээ үүсгэх/устгах, зураг upload/устгах (R2).
- ☐ Гишүүнчлэлийн өргөдөл ба холбоо барих зурвас илгээх → админд харагдана → устгана.
- ☐ `bunx wrangler tail` дээр алдаа гараагүй.

## 7. Сайтын тохиргооны шинэчлэл (migration 0001)

- ☐ Шинэ migration-ийг production дээр ажиллуулна (хоосон анхны мөрүүд, admin-ийн хадгалсан утгыг
  дарж бичихгүй):
  ```bash
  bunx wrangler d1 migrations list DB --remote     # 0001_site_settings_defaults харагдана
  bun run db:migrate:remote                        # = wrangler d1 migrations apply DB --remote
  bun run deploy
  ```

## 7b. 2025–2026 оны тайлан (migration 0002 + seed)

- ☐ Migration (0001 ба 0002 хоёуланг нь ажиллуулна), дараа нь deploy, дараа нь seed:
  ```bash
  bunx wrangler d1 migrations list DB --remote     # 0001, 0002 харагдана
  bun run db:migrate:remote
  bun run deploy
  bunx wrangler d1 execute DB --remote --file private/seed-report-2025-2026.sql
  ```
- ☐ `/impact`, `/about`, `/members`, `/news` дээр шалгана. Админ → Жилийн үр дүн дээрх шар
  тэмдэглэлүүдийг (тайлангийн зөрүү) уншина.

## 7c. Аюулгүй байдлын засвар (migration 0003)

- ☐ Turnstile-ийн жинхэнэ түлхүүр (доорх 3-р хэсэг). Production дээр тест түлхүүр эсвэл secret
  байхгүй бол join/contact маягт «түр ажиллахгүй» гэж харагдана (spam нэвтрэхгүй).
- ☐ Migration + deploy + шинэчилсэн seed:
  ```bash
  bunx wrangler d1 migrations list DB --remote     # 0003_auth_hardening_redirects
  bun run db:migrate:remote
  bun run deploy
  bun run report:seed                              # private/seed-report-2025-2026.sql-г шинэчилнэ
  bunx wrangler d1 execute DB --remote --file private/seed-report-2025-2026.sql
  ```
  Seed нь админы хийсэн засварыг дарж бичихгүй.

## 7d–7e. Migration 0004, 0005

- ✅ Production дээр хэрэгжсэн (2026-11-15-ны read-only шалгалт). Тэдгээрийн нэвтрэлтийн хэсгийг
  7f орлоно.

## 7f. Clerk нэвтрэлт ба өөрийн домэйн (migration 0006, 0007, 0008)

Энэ хүртэл production хуучин хувилбараараа ажиллана — **дараах бүх алхам бэлэн болтол deploy
хийхгүй**. Migration болон deploy-ийг нэг дор, дарааллаар нь хийнэ (0006 дараа хуучин код, эсвэл
шинэ код 0006-гүй ажиллахгүй).

**A. Домэйн (`<домэйн>`, жишээ нь `unicef130.mn`)**

- ☐ Домэйн худалдаж авна. Cloudflare → **Add a site** → `<домэйн>` (Free plan) → бүртгэгч дээрээ
  nameserver-ийг Cloudflare-ийнх болгоно (идэвхжтэл хэдэн цаг).
- ☐ Workers & Pages → unicef-club-130 → Settings → Domains & Routes → **Add → Custom domain** →
  `<домэйн>` (хүсвэл `www.<домэйн>`).
- ☐ Turnstile widget → Hostname management → `<домэйн>` нэмнэ (холбоо барих маягт).

**B. Clerk production instance**

- ☐ Clerk dashboard → application → **Create production instance** (Development-ийн тохиргоог
  хуулна) → домэйн: `<домэйн>`.
- ☐ **Domains** хуудсанд гарсан DNS бичлэгүүдийг (CNAME: `clerk.`, `accounts.`, и-мэйлийн
  `clkmail.`, `clk._domainkey.`, `clk2._domainkey.` гэх мэт — яг тэр хуудсанд байгаагаар)
  Cloudflare DNS-д нэмнэ. **Proxy status: DNS only** (саарал үүл). Clerk дээр бүгд «Verified»
  болтол хүлээнэ (48 цаг хүртэл).
- ☐ **User & authentication**: Email code (sign-up + sign-in) ON; Password, Phone, Username,
  First/Last name OFF; «Allow users to delete their accounts» OFF.
- ☐ **Google OAuth (өөрийн credential)**: Google Cloud Console → шинэ project → OAuth consent
  screen (External, апп нэр «130 UNICEF клуб», support и-мэйл, authorized domain `<домэйн>`) →
  Credentials → **OAuth client ID** (Web application) → Authorized redirect URI-д Clerk-ийн
  **SSO connections → Google** хуудсанд заасан URI-г хуулна → Client ID, Client secret-ийг Clerk-д
  оруулна. Consent screen-ийг **Publish** (Testing горимд зөвхөн туршилтын хэрэглэгч нэвтэрнэ).
- ☐ **Sessions → Customize session token**: `{ "role": "{{user.public_metadata.role}}" }`.
- ☐ **Attack protection → Bot sign-up protection** ON (боломжтой бол).
- ☐ **Multi-factor → Authenticator app + Backup codes** — plan-д байвал ON (байхгүй бол
  тэмдэглэнэ; кодоор албадаагүй).
- ☐ **Webhooks → Add endpoint**: `https://<домэйн>/api/webhooks/clerk`, events `user.created`,
  `user.updated`, `user.deleted`.

**C. Түлхүүр, тохиргоо (өөрийн терминалаас; утгыг чатад бичихгүй)**

- ☐ `wrangler.jsonc` → `"vars"`:
  `"SITE_URL": "https://<домэйн>"`,
  `"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_…"` (нийтэд ил утга).
- ☐ Secret-ууд:
  ```bash
  bunx wrangler secret put CLERK_SECRET_KEY               # sk_live_… (Clerk → API keys)
  bunx wrangler secret put CLERK_WEBHOOK_SIGNING_SECRET   # whsec_… (Clerk → Webhooks → endpoint)
  bunx wrangler secret delete BETTER_AUTH_SECRET          # хуучин нэвтрэлтийн нууц
  ```

**D. Нөөц → migration → deploy (дараалал чухал)**

- ☐ ```bash
  bunx wrangler d1 export DB --remote --output backup-before-clerk.sql # нөөц (git-д оруулахгүй)
  bunx wrangler d1 migrations list DB --remote # 0006, 0007 хүлээгдэж байна
  bun run db:migrate:remote # 0006 → 0007
  bun run deploy
  ```
  0007 нь хуучин админ бүртгэл, session, 2FA хүснэгтүүдийг **буцаалтгүй** устгана.
  ```

**E. Анхны админ ба шалгалт**

- ☐ `https://<домэйн>` → «Нэвтрэх» → өөрийн Google эсвэл и-мэйлээр нэвтэрнэ (→ `/join`).
- ☐ `bun run admin:grant -- <таны-и-мэйл>` (production Secret key-г нуугдмал асууна) → гараад
  дахин нэвтэрнэ → `/admin`.
- ☐ Clerk → Webhooks → endpoint → **Send example** / Attempts — 200 буцааж байгааг харна.
- ☐ Smoke test: нийтийн хуудсууд; `/admin` (нэвтрээгүй → sign-in); Админ → Элсэлт → туршилтын
  элсэлт үүсгээд өөр бүртгэлээр өргөдөл илгээх → Тэнцсэн → `/me` → тэр бүртгэлийг Хэрэглэгчид
  хэсгээс устгах → туршилтын элсэлтийг устгах. `bunx wrangler tail` дээр алдаа гараагүй.
- ☐ `bunx wrangler triggers deploy` шаардлагагүй — cron (`30 19 * * *`) `bun run deploy`-оор хамт
  тохирно; Dashboard → Worker → Settings → Triggers дээр харагдана.
- ☐ workers.dev хаягийг хаах (заавал биш): Domains & Routes → workers.dev → Disable.

## 8. Контент (deploy-ийн дараа админаас бөглөнө)

Бөглөөгүй бол тухайн хэсэг сайт дээр харагдахгүй (зохиомол утга гарахгүй).

- ☐ **Сайтын тохиргоо → Лого ба нүүр зураг**: сургуулийн лого, UNICEF лого, (заавал биш) клубын
  хамтын зураг + тайлбар. Эсвэл `public/logos/`-д файл нэмээд `bun run brand:assets` → deploy
  (OG зураг, favicon шинэчлэгдэнэ).
- ☐ **Холбоо барих**: хаяг (мн/en), и-мэйл, утас, цагийн хуваарь, газрын зураг.
- ☐ **Сошиал хаягууд**: Facebook, Instagram, TikTok, YouTube, бусад.
- ☐ **Тоон үзүүлэлт**: зөвхөн бодит тоо (эсвэл гишүүд/арга хэмжээг автоматаар тоолох).
- ☐ **Хамтрагчид**: нэр, лого, холбоос.
- ☐ **Хандивын мэдээлэл**: сургуулийн албан ёсны журмаар зөвшөөрөгдсөн бол.
- ☐ **Бидний тухай хуудас**: түүх ба хийдэг ажлын текстийг засаж «Сайт дээр харуулах»-г чагтлах.
- ☐ **Гишүүд**: удирдлага ба зөвлөх багшийг «Удирдлага» бүлэгт (хүүхдийн зургийг зөвшөөрөлтэй).
- ☐ Мэдээ, арга хэмжээ, зургийн цомог.
- ☐ Custom домэйн → README-ийн "Custom домэйн холбох".
- ☐ Google Search Console-д sitemap бүртгүүлэх (заавал биш).

## Google Sheets (заавал биш, дараа нь)

1. Google Cloud Console → шинэ project → **Google Sheets API**-г идэвхжүүлнэ.
2. IAM → Service Accounts → шинэ service account → **Keys → Add key → JSON** татна.
3. Google Sheet үүсгээд service account-ын и-мэйлд **Editor** эрхээр share хийнэ.
4. Tab-ын нэрийг `Applications` болгож, 1-р мөрөнд:
   `Огноо | Овог нэр | Анги | Утас | И-мэйл | Шалтгаан | Туслах чиглэл | Төлөв | ID`
5. Secret-үүдийг оруулна (утгыг терминал асууна):
   ```bash
   bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
   bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # JSON-ийн "private_key" бүхлээр
   bunx wrangler secret put GOOGLE_SHEET_ID
   ```
6. JSON файлыг устгана. Админ → Өргөдлүүд дээр "Sheets-д илгээх" товч идэвхжинэ.
