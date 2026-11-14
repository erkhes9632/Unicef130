# PRODUCTION_REPORT — Production-д бэлэн байдлын тайлан

**Огноо:** 2026-11-08 · **Commit:** `125e372` (энэ тайлангийн commit-ийн өмнөх) · **Deploy хийгээгүй.**

## Хэрхэн шалгасан бэ

Энэ тайланд "ажиллана" гэж бичсэн зүйл бүрийг **local дээр бодитоор ажиллуулж** шалгасан. Таамаглал
бичээгүй. Зөвхөн кодоор шалгасан, ажиллуулж үзээгүй зүйлийг "(кодоор)" гэж тусад нь тэмдэглэсэн.

| Арга                                                                                                          | Юуг                                                                             | Үр дүн          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------- |
| **E2E, бодит Chrome** (puppeteer-core, `bun run preview` = production-той ижил workerd runtime + local D1/R2) | Public 10 урсгал, admin 17 урсгал                                               | **27/27 PASS**  |
| `curl` + Next Server Action протокол                                                                          | Эрх, CSRF, origin, upload хязгаар, rate limit, 404, SEO                         | Доор хэсэг бүрт |
| `bun test` (`tests/`)                                                                                         | Validation, XSS renderer, CSV, огноо, PBKDF2, JWT, Server Action guard (mock)   | **47/47 PASS**  |
| Статик шалгалт                                                                                                | Runtime-д mock импорт, `requireRole` тоо, seed SQL-ийн агуулга, git-д нууц файл | Доор            |
| `bun run check`, `bun run build`, `bun run cf:build`                                                          | lint, typecheck, format, тест, build                                            | Бүгд амжилттай  |

Хүснэгтэн дэх тэмдэглэгээ:

- ✅ Бодитоор ажилладаг (production-д secret шаардахгүй)
- 🔑 Ажилладаг, гэхдээ secret/тохиргоо хэрэгтэй
- 🧪 Mock / placeholder / demo
- ❌ Байхгүй эсвэл эвдэрхий

---

## 1. Хураангуй

1. **Функцийн хувьд бэлэн.** Spec-ийн бүх хуудас, admin-ий бүх үйлдэл, form, R2 upload бодит browser дээр ажилласан. Runtime-д mock өгөгдөл огт ашиглагдахгүй, бүгд D1-ээс уншина.
2. **Deploy хийхийн өмнө засах 2 аюулгүй байдлын асуудал бий (P1, §10):**
   - Admin login **form**-д rate limit алга. 8 буруу оролдлого дараалан хийхэд бүгд боловсруулагдсан.
   - Security header-ууд (CSP, X-Frame-Options, HSTS) тохируулагдаагүй.
3. **Хүүхдийн өгөгдлийн 2 цоорхой (P1):**
   - Өргөдөл устгасан ч хүүхдийн нэр `activity_log`-д үлддэг.
   - Google Sheet дахь хуулбар нь устдаггүй.
4. **Cloudflare plan:** Bundle (7.8 MB) нь хязгаараас (64 MiB) хол доогуур. Гэхдээ Workers Free-ийн **10 ms CPU** хязгаар Next.js SSR болон нэвтрэлтэд хүрэлцэхгүй байх магадлал өндөр (local дээр хэмжих боломжгүй). **Workers Paid ($5/сар)-ийг зөвлөнө.**
5. **Контент:** Нэр, хаяг, тоо, зураг, лого бүгд placeholder (🧪). Deploy хийсний дараа admin-аас оруулна.
6. **Шударга дүгнэлт:** _"Тийм, гэхдээ."_ P1-ийн 4 засварыг (~1–2 цагийн ажил) хийж, secret-үүдээ тохируулаад, Workers Paid сонгоод deploy хийхэд бэлэн. Одоогийнхоороо deploy хийвэл ажиллана, гэхдээ admin нууц үгийг brute-force хийх боломжтой үлдэнэ.

---

## 2. Public сайт

Бүх хуудас `mn` (`/…`) болон `en` (`/en/…`) хэлээр ажиллана. Runtime-д `src/lib/mock/*`-г импортлодог файл
**байхгүй** (`grep` шалгалт): mock нь зөвхөн `scripts/seed.ts`-д ашиглагддаг. Хуудсууд өгөгдлийг зөвхөн
`src/lib/data/*`-аар дамжуулан уншина.

| Хуудас                                             | Харуулдаг зүйл                                                                                                | Өгөгдлийн эх үүсвэр                                   | Төлөв                                                                                                                                   | Файл                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/`                                                | Hero (2 лого), тоон үзүүлэлт, сүүлийн мэдээ, удахгүй болох арга хэмжээ, цомгийн preview, хамтрагч/сошиал, CTA | D1 (news, events, albums/images, settings)            | ✅ бүтэц · 🧪 тоон үзүүлэлт (seed: 40/12/300/500), хамтрагчдын 3 хоосон хайрцаг (кодонд hardcode)                                       | `src/app/[locale]/page.tsx`                                              |
| `/about`                                           | Түүх, эрхэм зорилго, үнэт зүйлс, хийдэг ажил, удирдлага                                                       | Текст: `messages/*.json` · удирдлага: D1 `members`    | ✅ · 🧪 текстийг батлах шаардлагатай                                                                                                    | `src/app/[locale]/about/page.tsx`                                        |
| `/news`, `/news/[slug]`                            | Ангиллын шүүлтүүр, хуудаслалт, нүүр зураг, Tiptap агуулга, хуваалцах товч, холбоотой мэдээ, JSON-LD           | D1 `news` (зөвхөн нийтлэгдсэн, огноо нь ирээдүйд биш) | ✅ (E2E: admin-аас үүсгэсэн мэдээ шууд гарсан, устгахад 404) · 🧪 жишээ 8 мэдээ                                                         | `src/app/[locale]/news/**`, `src/lib/data/news.ts`                       |
| `/events`, `/events/[slug]`                        | Удахгүй/өнгөрсөн, сарын хуанли (`?view=calendar`), байршил, огноо/цаг (УБ цаг), `.ics`                        | D1 `events`                                           | ✅ (E2E: 15:00 УБ цаг зөв гарсан; `.ics` = `text/calendar`) · 🧪 жишээ 6 арга хэмжээ                                                    | `src/app/[locale]/events/**`, `src/app/api/events/[slug]/ics/route.ts`   |
| `/members`                                         | Удирдлага + гишүүд, анги, initials avatar                                                                     | D1 `members` (`active`)                               | ✅ (E2E: consent-гүй зураг нийтэд **гараагүй**) · 🧪 12 нэр бүгд зохиомол                                                               | `src/app/[locale]/members/page.tsx`, `src/lib/data/members.ts`           |
| `/gallery`, `/gallery/[album]`                     | Цомгууд, masonry grid, lightbox (гар, swipe)                                                                  | D1 `albums`, `images`                                 | ✅ (E2E: lightbox нээгдэх → ArrowRight → Escape) · 🧪 seed зургууд нь `public/placeholders/*.svg`                                       | `src/app/[locale]/gallery/**`, `src/components/gallery/gallery-grid.tsx` |
| `/join`                                            | Гишүүнчлэлийн form                                                                                            | → D1 `applications` (§4)                              | ✅ / 🔑 Turnstile                                                                                                                       | `src/app/[locale]/join/page.tsx`                                         |
| `/contact`                                         | Хаяг, утас, и-мэйл, цагийн хуваарь, сошиал, газрын зураг, form                                                | D1 `settings` (fallback: `src/config/site.ts`)        | ✅ (E2E: admin-аас солисон утас гарсан) · 🧪 бүх контакт мэдээлэл placeholder · газрын зураг: URL оруулах хүртэл хоосон хайрцаг         | `src/app/[locale]/contact/page.tsx`                                      |
| `/support`                                         | Туслах арга замууд, хандивын товч                                                                             | Текст: messages · холбоос: D1 `settings.donationUrl`  | ✅ · хандивын холбоос хоосон тул товч нуугдсан (зориуд)                                                                                 | `src/app/[locale]/support/page.tsx`                                      |
| `/search?q=`                                       | Мэдээ + арга хэмжээнээс хайх (Кирилл case-insensitive)                                                        | D1 (сүүлийн 500 мөрийг JS-ээр шүүнэ)                  | ✅ (E2E: «хандив» → 2 үр дүн)                                                                                                           | `src/app/[locale]/search/page.tsx`                                       |
| 404                                                | "Хуудас олдсонгүй"                                                                                            | —                                                     | ✅ status **404** (`/nope`, `/news/nope`, `/en/nope`, `/admin/nope`) · server HTML нь хоосон shell, контент client дээр зурагдана (§10) | `src/app/[locale]/not-found.tsx`                                         |
| Хэл солих, бараан горим, mobile цэс                | —                                                                                                             | —                                                     | ✅ (E2E: `/news` → `/en/news`, `<html lang="en">`; бараан горим reload хийсний дараа хадгалагдсан; mobile цэс ажилласан)                | `src/components/layout/*`                                                |
| `sitemap.xml`, `robots.txt`, OG, JSON-LD, hreflang | —                                                                                                             | D1 + `SITE_URL`                                       | 🔑 `SITE_URL` var (байхгүй бол хүсэлтийн host-оос авна — curl-ээр шалгасан)                                                             | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/seo.ts`              |
| Лого                                               | "130-р сургууль × UNICEF"                                                                                     | `public/logos/*.png`                                  | 🧪 файл байхгүй → хоосон "лого" хайрцаг, console-д 404                                                                                  | `src/components/brand/logo-image.tsx`                                    |

**Энэ шалгалтаар засагдсан алдаа:** Хэл сольсны дараа `<html lang>` "mn" хэвээр үлддэг байсан. Үүнийг `src/components/layout/html-lang-sync.tsx`-ээр зассан (commit `125e372`) бөгөөд E2E-ээр баталгаажуулсан.

---

## 3. Admin panel (`/admin`)

Эрх: **Editor** (контент удирдана) · **Admin** (бүх эрх). Admin-ий **26 export хийгдсэн Server Action бүгд**
эхлээд `requireRole()` дууддаг: статик тоолсон, `tests/actions.test.ts`-ээр болон бодит хүсэлтээр шалгасан.

| Хэсэг               | Хийж чадах зүйл                                                                                                                                         | Хэн       | Төлөв, баталгаа                                                                                                                                                             | Файл                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Нэвтрэх / гарах     | Email + нууц үг, sign-up хаалттай                                                                                                                       | —         | ✅ E2E (UI form, logout-ийн дараа `/admin` → login) · ⚠️ form-д rate limit алга (§6)                                                                                        | `src/app/admin/login/*`, `src/app/admin/actions.ts`                                          |
| Хяналтын самбар     | Тоонууд, сүүлийн үйлдлүүд, шинэ өргөдлүүд                                                                                                               | editor+   | ✅                                                                                                                                                                          | `src/app/admin/(panel)/page.tsx`                                                             |
| **Мэдээ**           | Үүсгэх, засах, устгах · ноорог/нийтлэгдсэн · ирээдүйн огноо · Tiptap · Кирилл → латин slug · нүүр зураг (R2) · EN талбарууд                             | editor+   | ✅ E2E: Tiptap (тод текст `<strong>` болж гарсан) + 2400px PNG → **1920×1280 WebP 11KB** → нийтлэх → нийтийн хуудсанд гарсан → устгах dialog → мөр устсан, **R2 зураг 404** | `src/app/admin/(panel)/news/*`, `src/components/admin/news-form.tsx`, `rich-text-editor.tsx` |
| **Арга хэмжээ**     | CRUD · эхлэх/дуусах цаг (УБ) · байршил · нийтлэх · нүүр зураг · EN                                                                                      | editor+   | ✅ E2E (үүсгэх → нийтийн хуудсанд "2027 оны 2-р сарын 10", "15:00" гарсан) · устгах + R2 цэвэрлэгээ: (кодоор, мэдээнийхтэй ижил загвар)                                     | `src/app/admin/(panel)/events/*`                                                             |
| **Гишүүд**          | CRUD · удирдлага/гишүүн · анги · эрэмбэ · зураг · **"зургийг нийтэд харуулах"** (default: унтраалттай) · идэвхтэй                                       | editor+   | ✅ E2E (зурагтай гишүүн нэмэхэд нийтийн хуудсанд зураг **гараагүй**)                                                                                                        | `src/app/admin/(panel)/members/*`                                                            |
| **Зургийн цомог**   | Цомгийн CRUD · олон зураг зэрэг upload (full 1920 + thumb 640) · alt текст · дараалал · нүүр зураг · зураг/цомог устгах                                 | editor+   | ✅ E2E: 2 зураг → 1920×1280 + 640×427 WebP · дараалал солигдсон · нүүр зураг сонгогдсон · зураг устгахад full+thumb **404** · цомог устгахад бүх файл **404**               | `src/app/admin/(panel)/gallery/*`, `src/components/admin/gallery-manager.tsx`                |
| **Өргөдлүүд**       | Төлөвөөр шүүх, тоо · төлөв солих · тэмдэглэл · CSV · Sheets төлөв + дахин sync                                                                          | editor+   | ✅ E2E (төлөв, тэмдэглэл, CSV)                                                                                                                                              | `src/app/admin/(panel)/applications/*`                                                       |
| Өргөдөл устгах      | Хувийн мэдээллийг бүрмөсөн устгах                                                                                                                       | **admin** | ✅ (editor-т товч харагддаггүй — E2E; server талд хориглогддог — тест)                                                                                                      | дээрхтэй ижил                                                                                |
| **Зурвасууд**       | Шүүх, уншсан/уншаагүй                                                                                                                                   | editor+   | ✅ E2E                                                                                                                                                                      | `src/app/admin/(panel)/messages/*`                                                           |
| Зурвас устгах       | —                                                                                                                                                       | **admin** | ✅ (тест)                                                                                                                                                                   | дээрхтэй ижил                                                                                |
| **Сайтын тохиргоо** | Хаяг (mn/en), и-мэйл, утас, цагийн хуваарь (mn/en), Google Maps embed (зөвхөн google.com), сошиал (https), тоон үзүүлэлт, хандивын холбоос              | **admin** | ✅ E2E (утас → `/contact`) · editor → `/admin?forbidden=1` (E2E) · editor-ийн server action → "эрх байхгүй" (curl + тест)                                                   | `src/app/admin/(panel)/settings/*`                                                           |
| **Хэрэглэгчид**     | Үүсгэх (нэг удаа харагдах нууц үг) · эрх солих · идэвхгүй болгох (session-ууд устна) · нууц үг шинэчлэх · өөрийгөө түгжих боломжгүй · ≥1 идэвхтэй админ | **admin** | ✅ E2E (үүсгэх → нэвтэрсэн → идэвхгүй болгох → нэвтрэх **401**) · идэвхгүй хэрэглэгчийн одоо байгаа session шууд хүчингүй болсон (curl)                                     | `src/app/admin/(panel)/users/*`                                                              |

Admin UI зөвхөн Монгол хэлтэй (spec §5). Бүх admin хуудас `noindex, nofollow` (curl-ээр шалгасан).

---

## 4. Form-ууд

|                   | Join (`/join`)                                                                               | Contact (`/contact`)                             |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Client validation | ✅ RHF + zod (E2E: хоосон илгээхэд 6 алдаа гарсан)                                           | ✅                                               |
| Server validation | ✅ Дахин zod (`src/app/actions/forms.ts`). Илүү талбар (`status`, `isAdmin`) хаягдана (тест) | ✅                                               |
| Turnstile         | 🔑 (доор)                                                                                    | 🔑                                               |
| Хадгалах газар    | D1 `applications`: утас `+976…`, анги `10Б`, `consent_at` (E2E-ээр баталсан)                 | D1 `contact_messages` (и-мэйл жижиг үсгээр, E2E) |
| Цааш дамжих       | Google Sheets (🔑) + мэдэгдлийн hook (🧪 no-op)                                              | Мэдэгдлийн hook (🧪 no-op)                       |

**Turnstile** (`src/lib/integrations/turnstile.ts`, `src/components/forms/turnstile.tsx`):

- **Key байхгүй үед** (local одоогийн төлөв): Cloudflare-ийн албан ёсны _test_ key ашиглана. E2E-ээр шалгахад widget ачаалагдаж, `XXXX.DUMMY.TOKEN.XXXX` token авч, Siteverify амжилттай давсан. Token байхгүй бол `captcha` алдаа буцаана (curl).
- ⚠️ **Production-д `TURNSTILE_SECRET_KEY` тохируулахаа мартвал** test secret ашиглагдаж, бүх хүсэлт давна, өөрөөр хэлбэл spam хамгаалалт ажиллахгүй. Энэ үед log-д нэг удаа анхааруулга бичигдэнэ. Иймд заавал тохируулна.
- Site key-г runtime-д уншдаг (`TURNSTILE_SITE_KEY` var) тул солиход rebuild хийх шаардлагагүй.

**Google Sheets** (`src/lib/integrations/google-sheets.ts`, `src/lib/applications/sheets-sync.ts`):

- **Ажиллах зарчим:** Өргөдлийг D1-д хадгалсны дараа `ctx.waitUntil`-ээр background-д service-account JWT үүсгэнэ (Web Crypto RS256). Дараа нь `oauth2.googleapis.com/token` → Sheets `values:append` (`RAW` горимоор, тиймээс formula ажиллахгүй) дуудна.
- **Тохиргоо байхгүй үед:** Sync алгасагдаж, `[sheets] … not configured — skipping` log бичигдэнэ. Хэрэглэгч амжилттай хариу авна (curl + log-оор шалгасан).
- **Sync амжилтгүй болбол** (локалаар үүсгэсэн хуурамч service account-аар бодитоор туршсан):
  - Хэрэглэгч `{"ok":true}` хариу авна, өргөдөл D1-д хадгалагдана.
  - `sheets_error`-д `Google token error 400: invalid_grant…` бичигдэнэ.
  - Admin дээр "Sheets sync алдаа…" болон **"Дахин sync хийх"** товч харагдана.
- **Амжилттай sync:** 🔑 Бодит Google түлхүүргүйгээр баталгаажуулах боломжгүй. JWT гарын үсгийг local RSA түлхүүрээр баталгаажуулсан (`tests/crypto-media.test.ts`), гэхдээ Google руу бодитоор мөр нэмэгдэхийг шалгаагүй. Анхны deploy-ийн дараа нэг өргөдөл илгээж шалгана уу.

---

## 5. Зураг upload (R2)

| Зүйл                                                                                                | Төлөв                                                                                                                                                                                 | Баталгаа                                                                                        | Файл                                                           |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Browser дээр багасгах (WebP, JPEG fallback), 1920px full / 640px thumb, EXIF/GPS устгах (re-encode) | ✅                                                                                                                                                                                    | E2E: 2400×1600 PNG → 1920×1280 WebP; thumb 640×427                                              | `src/lib/media/client.ts`                                      |
| Upload endpoint: editor+, same-origin, **5 MB** хязгаар, magic-byte-аар төрөл таних (JPEG/PNG/WebP) | ✅                                                                                                                                                                                    | curl: 6 MB → 400 · хуурамч PNG → 400 · нэвтрээгүй → 401 · гадны origin → 403 · буруу kind → 400 | `src/app/api/admin/upload/route.ts`, `src/lib/media/server.ts` |
| Эх файлын хязгаар (browser) 25 MB                                                                   | ✅ (кодоор)                                                                                                                                                                           | —                                                                                               | `src/lib/media/constants.ts`                                   |
| `/media/*` serving: immutable cache, ETag/304, `nosniff`, path traversal хамгаалалт                 | ✅                                                                                                                                                                                    | curl: 304, `../` → 404                                                                          | `src/app/media/[...key]/route.ts`                              |
| Устгахад R2-оос устах                                                                               | ✅ мэдээний cover, цомгийн зураг, цомог (E2E → 404) · 🟡 арга хэмжээ/гишүүн устгах, зураг солих (кодоор ижил `deleteMediaUrls`; мэдээний cover солих урсгалыг өмнө curl-ээр шалгасан) |                                                                                                 | `*/actions.ts`                                                 |
| Production R2 bucket                                                                                | 🔑 `unicef-club-130-media` үүсгэнэ                                                                                                                                                    |                                                                                                 | `wrangler.jsonc`                                               |

Анхааруулга: Хэрэглэгч зураг upload хийгээд form-оо хадгалахгүй орхивол R2-д эзэнгүй файл үлдэнэ. Үүнийг цэвэрлэх механизм одоогоор байхгүй (§10, P3).

---

## 6. Auth & Security

| Сэдэв                             | Төлөв          | Баталгаа / тайлбар                                                                                                                                                                                                                        | Файл                                                                                                      |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Нууц үгийн hash                   | ✅             | PBKDF2-SHA256, 100 000 давталт, 16 байт salt, constant-time харьцуулалт. Нэг баталгаажуулалт ≈ 6.5 ms (Mac, Bun). Тест: round-trip, буруу формат татгалзах                                                                                | `src/lib/auth/password.ts`                                                                                |
| Нийтийн бүртгэл хаалттай          | ✅             | `sign-up/email` → `EMAIL_PASSWORD_SIGN_UP_DISABLED`                                                                                                                                                                                       | `src/lib/auth/index.ts`                                                                                   |
| Session                           | ✅             | DB session, 7 хоног, cookie нь `HttpOnly` + `Secure` + `__Secure-` угтвартай (cookie jar). Admin шалгалт cookie cache-ийг тойрч D1-ээс шалгадаг тул идэвхгүй болгосон хэрэглэгч шууд гардаг (curl)                                        | `src/lib/auth/session.ts`                                                                                 |
| Role check Server Action бүрт     | ✅             | 26/26 action `requireRole()`. Editor → admin action: "эрх байхгүй"; нэвтрээгүй → "Дахин нэвтэрнэ үү" (curl + `tests/actions.test.ts`)                                                                                                     | `src/app/admin/(panel)/*/actions.ts`                                                                      |
| Admin route хамгаалалт            | ✅             | `/admin/*` layout → `requireUser()`; нэвтрээгүй → 307 `/admin/login`; admin-only хуудас → `?forbidden=1`. CSV route: нэвтрээгүй → 401                                                                                                     | `src/app/admin/(panel)/layout.tsx`, `applications/export/route.ts`                                        |
| Rate limit — `/api/auth/*`        | ✅ (хэсэгчлэн) | Буруу нууц үг: 401, 401, **429**… (curl). Санах ойн storage тул isolate бүрт тусдаа тоолно                                                                                                                                                | `src/lib/auth/index.ts`                                                                                   |
| **Rate limit — admin login form** | ❌             | UI form (Server Action → `auth.api.signInEmail`) HTTP rate limiter-ийг тойрдог: 8 буруу оролдлого бүгд боловсруулагдсан. **P1**                                                                                                           | `src/app/admin/actions.ts`                                                                                |
| XSS (Tiptap агуулга)              | ✅             | Allow-list renderer, `dangerouslySetInnerHTML` ашигладаггүй; `javascript:`/`data:` холбоос, `<script>`, `onclick`, `iframe` хаягдана (тест + no-JS form-оор `<script>` агуулга escape хийгдсэн). Rich text JSON-ий хэмжээ ≤200KB, гүн ≤12 | `src/components/common/rich-text.tsx`, `src/lib/rich-text/sanitize.ts`, `src/lib/validation/rich-text.ts` |
| CSRF                              | ✅             | Better Auth: cookie-тэй хүсэлтэд гадны origin → **403**. Server Action: гадны origin → Next татгалзсан (500), **өгөгдөл хадгалагдаагүй**. Upload: гадны origin → 403                                                                      | —                                                                                                         |
| CSV injection                     | ✅             | `= + - @` угтвартай нүднүүд `'`-тэй болно (утасны дугаараас бусад); UTF-8 BOM (тест)                                                                                                                                                      | `src/lib/csv.ts`                                                                                          |
| Sheets formula injection          | ✅ (кодоор)    | `valueInputOption=RAW`                                                                                                                                                                                                                    | `google-sheets.ts`                                                                                        |
| Map embed / гадны холбоос         | ✅             | Зөвхөн `https://www.google.com/maps/embed…`; сошиал/хандив зөвхөн `https://` (тест)                                                                                                                                                       | `src/lib/validation/admin.ts`                                                                             |
| Нууц файл git-д                   | ✅             | `.dev.vars`, `.wrangler/`, `.open-next/` track хийгдээгүй (`git ls-files`)                                                                                                                                                                | `.gitignore`                                                                                              |
| **Security header-ууд**           | ❌             | CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, HSTS байхгүй (curl). **P1**                                                                                                                            | —                                                                                                         |

**Сайжруулах зүйлс** (дэлгэрэнгүй нь §10-д):

1. Login form-д rate limit тавих: IP + и-мэйлээр D1-д тоолж, жишээ нь 15 минутад 5 оролдлого зөвшөөрөх. Мөн Better Auth-ийн rate limit storage-ийг `database` болгох.
2. Security header нэмэх (middleware эсвэл `next.config.ts` → `headers()`).
3. Login form-д Turnstile нэмэх.
4. Admin-д 2FA нэмэх (Better Auth plugin), урт хугацаанд.

---

## 7. Хүүхдийн өгөгдөл

| Асуулт                          | Хариу                                                                                                                                                                                                                                                                                                      | Баталгаа                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Join form-оор юу цуглуулдаг вэ? | Овог нэр, анги, утас, и-мэйл (заавал биш), шалтгаан, туслах чиглэл, зөвшөөрлийн цаг. **IP хадгалдаггүй** (Turnstile шалгалтад л ашиглана)                                                                                                                                                                  | `src/db/schema.ts` → `applications`; E2E-ийн мөр             |
| Contact form?                   | Нэр, и-мэйл, гарчиг, зурвас                                                                                                                                                                                                                                                                                | `contact_messages`                                           |
| Гишүүдийн хуудас?               | Нэр, үүрэг, анги. Зураг **зөвхөн** "нийтэд харуулах" асаалттай үед гарна (default: унтраалттай)                                                                                                                                                                                                            | E2E                                                          |
| Хэн харж чаддаг вэ?             | Өргөдөл, зурвасыг **admin болон editor** харна. CSV татах эрх **editor-т ч бий**                                                                                                                                                                                                                           | `applications/export/route.ts` (`getCurrentUser` л шалгадаг) |
| Устгах боломж?                  | Өргөдөл, зурвасыг **зөвхөн admin** бүрмөсөн устгана                                                                                                                                                                                                                                                        | E2E + тест                                                   |
| ⚠️ Устгасны дараа үлддэг зүйл   | 1) Төлөв солих, устгах үед хүүхдийн **нэр `activity_log.summary`-д бичигддэг** бөгөөд устгасны дараа ч үлдэнэ (local D1-ээс `E2E Сурагч: accepted` мөр олдсон). 2) **Google Sheet дахь мөр устахгүй.** 3) Хэн нэгний татсан CSV файлууд. 4) D1 Time Travel (Free 7 хоног, Paid 30 хоног сэргээх боломжтой) | D1 query; `deleteApplication` код                            |
| Хадгалах хугацааны бодлого      | **Байхгүй.** Хуучин өргөдөл автоматаар устахгүй                                                                                                                                                                                                                                                            | —                                                            |
| Зургийн GPS                     | Upload хийхэд re-encode хийгдэж EXIF устдаг                                                                                                                                                                                                                                                                | `src/lib/media/client.ts`                                    |

---

## 8. Production-д хийх ёстой зүйлс

### Local тест хэрэглэгчид production-д орохгүй — баталгаа

- `scripts/seed.ts --print-sql` гаралт: 55 statement, `user`/`account`/`session`/`verification` хүснэгтэд **0** INSERT. Зөвхөн albums, events, images, members, news, settings хүснэгтүүдэд бичнэ.
- `admin@example.com`, `editor@example.com` бүртгэлүүд зөвхөн **local** D1 файлд (`.wrangler/state/…`) байгаа. Энэ хавтас gitignore-д орсон бөгөөд production D1 нь хоосноос эхэлнэ.
- Seed-д орох цорын ганц `example.com` хаяг нь тохиргооны placeholder и-мэйл `unicef.club130@example.com` (🧪). Admin → Тохиргооноос солино.
- Локал тест бүртгэлүүд зөвхөн локал D1-д байдаг. Production-д ямар ч утгагүй.

### Эхний админ үүсгэх (DEPLOY_CHECKLIST.md §9)

```bash
bun scripts/create-admin.ts --email <и-мэйл> --name "<Нэр>" --print-sql > admin.sql   # нууц үг терминалд нэг удаа
bunx wrangler d1 execute DB --remote --file admin.sql && rm admin.sql
```

`--print-sql` горим SQL-ийг stdout руу, нууц үгийг stderr руу хэвлэдэг. Үүнийг локал дээр шалгасан, харин remote дээр ажиллуулаагүй (hard rule).

### Secret ба тохиргооны бүрэн жагсаалт

| Нэр                                                           | Төрөл            | Заавал уу | Байхгүй бол                                                                                                                     |
| ------------------------------------------------------------- | ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                                          | secret           | **Тийм**  | Байхгүй үеийн үйлдлийг шалгаагүй — заавал тохируулна. Local-ынхийг ашиглахгүй, `openssl rand -base64 32`-ээр шинээр үүсгэнэ     |
| `BETTER_AUTH_TRUSTED_ORIGINS`                                 | var              | **Тийм**  | Admin нэвтрэлтийн origin шалгалтад ашиглагдана (жишээ: `https://domain,https://www.domain`). Тохируулаагүй хувилбарыг шалгаагүй |
| `BETTER_AUTH_URL`                                             | var              | Зөвлөмж   | Хүсэлтийн URL-аас таана                                                                                                         |
| `SITE_URL`                                                    | var              | Зөвлөмж   | Canonical/sitemap/OG нь хүсэлтийн host-ийг ашиглана                                                                             |
| `TURNSTILE_SITE_KEY`                                          | var              | **Тийм**  | Test key → spam хамгаалалтгүй                                                                                                   |
| `TURNSTILE_SECRET_KEY`                                        | secret           | **Тийм**  | Test secret → бүгд давна                                                                                                        |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`                                | secret           | Үгүй      | Sheets sync алгасагдана                                                                                                         |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`                          | secret           | Үгүй      | ″                                                                                                                               |
| `GOOGLE_SHEET_ID`                                             | secret           | Үгүй      | ″                                                                                                                               |
| `GOOGLE_SHEET_TAB`                                            | var              | Үгүй      | `Applications`                                                                                                                  |
| D1 `database_id`                                              | `wrangler.jsonc` | **Тийм**  | Одоогоор `00000000-…` placeholder                                                                                               |
| R2: `unicef-club-130-media`, `unicef-club-130-opennext-cache` | buckets          | **Тийм**  | Deploy амжилтгүй болно                                                                                                          |

---

## 9. Cloudflare-ийн хязгаар

Эх сурвалж: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (2026-10-29-нд шинэчлэгдсэн, 2026-11-08-нд уншсан), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 free tier enforcement changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

| Нөөц             | Манай хэмжилт / тооцоо                                                                                                   | Free                                  | Paid ($5/сар)            | Дүгнэлт                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Worker хэмжээ    | `handler.mjs` 7.8 MB uncompressed (2.0 MB gzip)                                                                          | 64 MiB uncompressed (gzip хязгааргүй) | 64 MiB                   | ✅ Асуудалгүй. _Өмнө README/checklist-д бичсэн "3 MB gzip" хязгаар хуучирсан байсан тул зассан._       |
| **CPU / хүсэлт** | Local дээр хэмжих боломжгүй. Local workerd-ийн wall time ~20 ms/хуудас (D1 query-тэй), PBKDF2 ≈ 6.5 ms                   | **10 ms**                             | 30 сек (5 мин хүртэл)    | ⚠️ **Free дээр Next.js SSR ихэнх хүсэлтэд 10 ms-ээс хэтрэх эрсдэлтэй (Error 1102). Paid-ийг зөвлөнө.** |
| Хүсэлт           | Клубын сайт, өдөрт хэдэн зуу–мянга (таамаг)                                                                              | 100 000/өдөр                          | хязгааргүй               | ✅                                                                                                     |
| Memory           | —                                                                                                                        | 128 MB                                | 128 MB                   | ✅                                                                                                     |
| D1 уншилт        | Нүүр хуудас ≈ 40–60 мөр (бүх цомгийн зургийг уншдаг) · хайлт ≈ 1000 мөр (кодоос тооцсон, хэмжээгүй)                      | 5 сая/өдөр                            | илүү их (тоог шалгаагүй) | ✅ (≈ 80 000+ хуудас/өдөр). Free хязгаар 2026-09-01-ээс мөрдөгдөж эхэлсэн                              |
| D1 бичилт        | Өргөдөл, admin засвар                                                                                                    | 100 000/өдөр                          | илүү их                  | ✅                                                                                                     |
| D1 хэмжээ        | Хэдэн MB                                                                                                                 | 500 MB/DB, 5 GB/account               | илүү их                  | ✅                                                                                                     |
| R2 хадгалалт     | E2E зураг: full 11 KB (энгийн градиент) — бодит фото илүү том; ойролцоогоор 0.2–0.5 MB гэж тооцвол 10 GB ≈ 20 000+ зураг | 10 GB-сар                             | хэрэглээгээр төлнө       | ✅                                                                                                     |
| R2 үйлдэл        | Upload = Class A; `/media` уншилт = Class B (`immutable` cache-тэй)                                                      | 1 сая A, 10 сая B /сар                | A $4.50, B $0.36 / сая   | ✅                                                                                                     |
| Subrequest       | Join: Turnstile 1 + Google 2                                                                                             | 50 гадаад/хүсэлт                      | 10 000                   | ✅                                                                                                     |

**Paid plan хэзээ хэрэгтэй вэ?** CPU-ийн хязгаараас болж **эхнээсээ** хэрэгтэй гэж үзэж байна. Free дээр туршиж болох ч Cloudflare Dashboard → Workers → Metrics дээр "Exceeded CPU" алдаа гарвал шууд Paid руу шилжинэ.

---

## 10. Мэдэгдэж буй асуудлууд, TODO(content), сайжруулалт

### Мэдэгдэж буй асуудлууд

| #   | Асуудал                                                                                                 | Нөлөө                                |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Admin login form-д rate limit алга (§6)                                                                 | Brute-force хийх эрсдэл              |
| 2   | Security header алга                                                                                    | Clickjacking, CSP хамгаалалт байхгүй |
| 3   | `activity_log`-д хүүхдийн нэр үлддэг; Sheet-ийн мөр устахгүй (§7)                                       | Хувийн мэдээлэл бүрэн устахгүй       |
| 4   | 404 хуудасны server HTML хоосон, контент client дээр зурагдана (status зөв 404)                         | JS-гүй хэрэглэгч хоосон хуудас харна |
| 5   | Admin дээр байхгүй ID (`/admin/news/<буруу>`) 404 UI-тай боловч HTTP 200 буцаана (admin `loading.tsx`)  | Ач холбогдолгүй, noindex             |
| 6   | Lighthouse _simulated_ mobile: контент ихтэй хуудсууд 85 (фонт 6 файл). Бодит throttling-тэй хэмжилт 99 | PageSpeed дээр 85 харагдана          |
| 7   | Upload хийгээд хадгалаагүй зураг R2-д үлдэнэ                                                            | Багахан зай эзэлнэ                   |
| 8   | Build "middleware deprecated" анхааруулга (OpenNext-д зориуд)                                           | Байхгүй                              |
| 9   | Лого байхгүй тул console-д 404                                                                          | Лого нэмэхэд алга болно              |
| 10  | Workers Free-ийн CPU хязгаар (§9)                                                                       | Paid сонгоно                         |

### TODO(content) — чиний оруулах зүйлс

1. `public/logos/school-130.png`, `public/logos/unicef.png`. Дараа нь `scripts/og/og-default.html`-ээс `public/og-default.png`-г логотой болгож дахин үүсгэх.
2. Холбоо барих мэдээлэл: хаяг (mn/en), утас, и-мэйл (`unicef.club130@example.com` placeholder), цагийн хуваарь, Google Maps embed. Admin → Тохиргоо.
3. Сошиал хаягууд. Нүүр хуудасны тоон үзүүлэлтүүд (одоогоор 40/12/300/500 зохиомол).
4. Хандивын холбоос (сургуулийн журмаар, заавал биш).
5. Гишүүдийн жинхэнэ нэр, үүрэг, анги (одоогийн 12 нэр зохиомол), consent-тэй зураг.
6. Хамтрагчид: нүүр хуудсанд 3 хоосон хайрцаг (`src/app/[locale]/page.tsx`) байгаа. Жинхэнэ хамтрагч нэмэх эсвэл хэсгийг хасах.
7. Жишээ мэдээ, арга хэмжээ, цомгийг солих эсвэл production seed хийхгүй байх.
8. Бидний тухай хуудасны текст (`messages/*.json` → `About.*`), footer-ийн UNICEF-тэй холбоотой тайлбарын үг (`Footer.disclaimer`).
9. Арга хэмжээний яг байршлууд.

### Сайжруулалт (эрэмбээр)

**P1 — deploy-ийн өмнө**

1. Login rate limit: D1 дээр тулгуурласан тоолуур (IP+и-мэйл) тавих; Better Auth `rateLimit.storage: "database"`; login form-д Turnstile нэмэх.
2. Security header нэмэх: `Content-Security-Policy` (self + challenges.cloudflare.com + fonts), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (домэйн холбосны дараа).
3. `activity_log`-д хүүхдийн нэрийн оронд өргөдлийн ID бичих; өргөдөл устгахад холбогдох log-ийг цэвэрлэх.
4. Workers Paid сонгох, production secret-үүдийг бүрэн тохируулах (§8).

**P2 — эхний сард**

5. Хувийн мэдээлэл хадгалах бодлого: жишээ нь татгалзсан өргөдлийг 6 сарын дараа устгах cron.
6. Sheet-ээс мөр устгах эсвэл "admin дээр устгасан бол Sheet-ээс гараар устга" гэсэн сануулга харуулах.
7. CSV татах эрхийг зөвхөн admin-д олгох эсэхийг шийдэх.
8. 404 хуудсыг server дээр бүрэн render хийх.
9. Мэдэгдэл: шинэ өргөдөл ирэхэд и-мэйл илгээх (`notifications.ts` hook бэлэн).

**P3 — дараа**

10. Хадгалаагүй upload-ыг цэвэрлэх.
11. Фонтын хэмжээг багасгах (subset эсвэл гарчигт `display: optional`).
12. Admin 2FA.
13. E2E тестийг (энэ тайланд ашигласан puppeteer script) төсөлд CI болгон оруулах.

---

## Хавсралт: E2E үр дүн (2026-11-08, local workerd preview)

Public (390px, mobile emulation), **10/10 PASS**:

- join form (Turnstile test key → D1 мөр)
- join form хоосон validation
- contact form (→ D1)
- lightbox
- mobile цэс
- хэл солих (+`html lang`)
- бараан горим (reload хийсний дараа хадгалагдсан)
- хайлт
- `.ics`
- console алдаагүй (лого 404-өөс бусад)

Admin (1366px), **17/17 PASS**:

- UI-аар нэвтрэх
- мэдээ үүсгэх (Tiptap + cover resize → нийтлэх → нийтийн хуудас → устгах → R2 404)
- арга хэмжээ (УБ цаг)
- гишүүн (consent-гүй зураг нуугдсан)
- цомог (multi-upload, thumb, дараалал, нүүр зураг, зураг устгах → R2 404, цомог устгах → R2 404)
- өргөдөл (төлөв, тэмдэглэл, CSV)
- зурвас (уншсан)
- тохиргоо (→ /contact)
- хэрэглэгч (үүсгэх → нэвтрэх → идэвхгүй болгох → 401)
- editor-ийн хязгаар (nav, redirect, устгах товч байхгүй)
- logout
- console алдаагүй

Нэмэлт curl шалгалтууд:

- Гадны origin-оос server action дуудахад татгалзсан, өгөгдөл хадгалагдаагүй.
- 6 MB upload → 400.
- `/api/auth` rate limit → 429.
- CSRF → 403.
- Admin `noindex`.
- Cookie нь `HttpOnly` + `Secure` + `__Secure-`.
- Sheets sync амжилтгүй урсгалыг хуурамч service account-аар туршсан.
- Бүх байхгүй route → 404.

Script-үүд төслийн dependency-д ороогүй (P3 #13).
