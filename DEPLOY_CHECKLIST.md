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

- ✅ `SITE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` = workers.dev URL.
- ✅ `GOOGLE_SHEET_TAB` = `Applications`.
- ☐ `TURNSTILE_SITE_KEY` — Turnstile widget үүсгэсний дараа (доорх 3-р алхам).

## 3. Нууц утгууд

- ✅ `BETTER_AUTH_SECRET` — шинээр үүсгэж шууд дамжуулсан (локалынхаас өөр).
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
- ☐ **Plan:** Workers Free нь хүсэлт бүрт 10 ms CPU хязгаартай. Нэвтрэлт (PBKDF2) эсвэл хүнд
  хуудсууд Error 1102 өгвөл **Workers Paid** ($5/сар) руу шилжинэ.

## 5. Эхний админ

- ☐ Өөрийн терминал дээр:
  ```bash
  bun run admin:create -- o.erkhes2009@gmail.com --name "Админ"
  ```
  Нууц үгийг 2 удаа нуугдмал асууна (≥ 12 тэмдэгт).
- ☐ `/admin/login`-оор нэвтэрч шалгана. Бусад редакторыг Админ → Хэрэглэгчид-ээс нэмнэ.

## 6. Smoke test

- ✅ Бүх нийтийн хуудас (mn + en) 200, `sitemap.xml`, `robots.txt` зөв домэйнтэй.
- ✅ Байхгүй хуудас 404, 500 алдаа байхгүй.
- ✅ Нэвтрээгүй үед `/admin` → `/admin/login` (307).
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
