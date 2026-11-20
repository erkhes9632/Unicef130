# 130 UNICEF клуб — вэбсайт

130-р сургуулийн **130 UNICEF клуб**-ын вэбсайт (клуб 2025 онд байгуулагдсан): мэдээ, арга хэмжээ,
үр дүн, гишүүд, зургийн цомог, гишүүнчлэлийн элсэлт, гишүүний хэсэг (сайн дурын цаг, гэрчилгээ),
админ хэсэг.

**Сайт:** https://130foreverychild.site · Англи хувилбар: `/en` · Нууцлал: `/privacy`

| Эрх                         | Юу хийж чадах вэ                                                           |
| --------------------------- | -------------------------------------------------------------------------- |
| Хэн ч                       | Нийтийн сайт (монгол + англи, цайвар/бараан горим)                         |
| Нэвтэрсэн (өргөдөл гаргагч) | Элсэлт нээлттэй үед өргөдөл гаргах, төлөвөө `/join` дээр харах             |
| **Гишүүн**                  | «Миний хэсэг» (`/me`): сайн дурын цаг, арга хэмжээнд бүртгүүлэх, гэрчилгээ |
| **Админ**                   | Админ хэсэг (`/admin`) бүхэлдээ + «Миний хэсэг»                            |

## Технологи

| Хэсэг          | Сонголт                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| Runtime / багц | [Bun](https://bun.sh) — `bun`, `bunx` (npm/yarn ашиглахгүй)                |
| Framework      | Next.js 16 (App Router, TypeScript, Server Actions), next-intl (mn + en)   |
| Загвар         | Tailwind CSS v4, shadcn/ui, lucide-react                                   |
| Хостинг        | Cloudflare Workers (`@opennextjs/cloudflare` + wrangler), өдөр бүрийн cron |
| Өгөгдөл        | Cloudflare D1 (Drizzle ORM), зураг — Cloudflare R2                         |
| Нэвтрэлт       | Clerk: Google эсвэл и-мэйл код (нууц үггүй); эрх `admin` / `member`        |
| Маягт          | zod + react-hook-form; «Холбоо барих» маягтад Cloudflare Turnstile         |

Хавтас: `src/app/[locale]` нийтийн хуудсууд · `src/app/admin` админ · `src/lib` логик ба өгөгдөл ·
`src/db/schema.ts` хүснэгтүүд · `drizzle/migrations` SQL · `messages/` орчуулга · `scripts/`
туслах командууд · `tests/` unit тест · `e2e/` Playwright · `worker.ts` Worker-ийн оролт.

## Локал дээр ажиллуулах

Шаардлага: Bun ≥ 1.3. Cloudflare бүртгэл хэрэггүй (D1/R2-ийг локалд дуурайлгана).

```bash
bun install
cp .dev.vars.example .dev.vars   # Clerk **Development** instance-ийн pk_test_ / sk_test_ түлхүүрийг бичнэ
bun run db:migrate:local
bun run db:seed:local            # жишээ контент (зөвхөн локал)
bun run dev                      # http://localhost:3000 → «Нэвтрэх»
bun run admin:grant -- <таны-и-мэйл> --dev   # нэг удаа нэвтэрсний дараа өөрийгөө админ болгох
bun run hooks:install            # commit бүрийн өмнө `bun run check` (нэг удаа)
```

Production-той ижил орчинд: `bun run preview` (http://localhost:8787). Локалд Turnstile туршилтын
түлхүүр ашиглана, Google Sheets sync алгасагдана.

| Команд                                         | Үүрэг                                               |
| ---------------------------------------------- | --------------------------------------------------- |
| `bun run check`                                | lint + typecheck + format + knip + unit тест        |
| `bun run build` / `bun run cf:build`           | Next.js build / Cloudflare Worker bundle            |
| `bun run preview`                              | Локал Workers preview (:8787)                       |
| `bun run test:e2e`                             | E2E (preview асаалттай; Clerk Development instance) |
| `bun run db:generate`                          | `schema.ts` өөрчилсний дараа шинэ migration үүсгэх  |
| `bun run db:migrate:local` / `db:reset:local`  | Локал D1: migration / бүрэн шинэчлэх                |
| `bun run admin:grant -- <и-мэйл> [--dev]`      | Админ эрх олгох (`--dev` = локал Clerk instance)    |
| `bun run admin:revoke -- <и-мэйл> [--dev]`     | Админ эрх хасах (сүүлчийн админыг хасахгүй)         |
| `bun run report:seed`                          | Жилийн тайлангийн SQL (`private/`-аас)              |
| `bun run brand:assets` / `bun run fonts`       | Логоноос OG зураг, favicon / фонт файлууд           |
| `bun run db:migrate:remote` · `bun run deploy` | **Production**: migration · deploy                  |

## Production

Deploy-г **гараар** хийнэ (CI, автомат deploy байхгүй). Эхлээд `bunx wrangler whoami`-аар зөв
Cloudflare бүртгэлд нэвтэрсэн эсэхээ шалгана.

| Нөөц      | Нэр                                                                |
| --------- | ------------------------------------------------------------------ |
| Worker    | `unicef-club-130` → https://130foreverychild.site                  |
| D1 (APAC) | `unicef-club-130-db` (binding `DB`)                                |
| R2        | `unicef-club-130-media` (зураг), `unicef-club-130-opennext-cache`  |
| Cron      | өдөр бүр 03:30 (УБ) — хугацаа дууссан өргөдөл, rate-limit цэвэрлэх |
| Clerk     | Production instance, домэйн `130foreverychild.site`                |

### Deploy хийх

```bash
git pull && bun install
bun run check && bun run cf:build
bunx wrangler d1 migrations list DB --remote   # шинэ migration байвал доорхыг үз
bun run deploy
```

### Шинэ migration

1. `src/db/schema.ts` → `bun run db:generate` → `bun run db:migrate:local` → локалд шалгана.
2. Нөөц авна (доор) → `bun run db:migrate:remote` → `bun run deploy`.
3. Багана/хүснэгт устгах migration-ийг шинэ код deploy хийгдэж, хуучин код түүнийг ашиглахаа
   больсны дараа л ажиллуулна.

⚠️ `bun run db:seed:local` бол жишээ контент — production дээр хэзээ ч ажиллуулахгүй.

### Нөөц ба сэргээх (D1)

```bash
bunx wrangler d1 export DB --remote --output private/backup-$(date +%F).sql   # бүрэн нөөц
bunx wrangler d1 time-travel info DB                                          # сэргээх цэг (30 хоног)
bunx wrangler d1 time-travel restore DB --timestamp=2026-11-20T10:00:00+08:00
```

`private/` git-д ордоггүй (гишүүдийн нэр агуулдаг). `restore` нь бүх санг тэр мөч рүү буцаана —
өмнө нь `export` хийнэ.

### Secret-ууд ба тэдгээрийг солих

Secret-ийг файлд, git-д, чатад хэзээ ч бичихгүй; `wrangler secret put` утгыг нуугдмал асууна.
`put` нь Worker-ийн одоогийн хувилбарт **шууд** хүчинтэй болно.

| Нэр                            | Хаанаас                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `CLERK_SECRET_KEY`             | Clerk → (Production) → API keys → Secret key             |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk → Webhooks → endpoint → Signing secret (`whsec_…`) |
| `TURNSTILE_SECRET_KEY`         | Cloudflare → Turnstile → widget → Secret key             |
| `GOOGLE_*` (заавал биш)        | Google Sheets sync — байхгүй бол чимээгүй алгасагдана    |

Нууц биш тохиргоо (`SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `TURNSTILE_SITE_KEY`) нь
`wrangler.jsonc` → `"vars"`-д; өөрчилсний дараа `bun run deploy`.

**Солих (rotate)** — алдагдсан гэж сэжиглэвэл, эсвэл хариуцагч солигдоход:

1. Шинэ утга үүсгэнэ: Clerk → API keys → шинэ secret key / Webhooks → endpoint → «Rotate secret» /
   Turnstile → widget → «Rotate secret key».
2. `bunx wrangler secret put <НЭР>` → шинэ утгыг оруулна.
3. Сайтыг шалгаад (нэвтрэх, «Холбоо барих» маягт, Clerk → Webhooks → Attempts 200) хуучин утгыг
   Clerk / Turnstile дээр устгана.

### Лог

`bunx wrangler tail` (бодит цаг, `--status error` = зөвхөн алдаа) эсвэл Cloudflare Dashboard →
Workers & Pages → unicef-club-130 → Observability. Лог нь JSON мөр, хувийн мэдээлэлгүй (ID л).

## Админ болох / шинэ админ нэмэх

**Анхны админ** (эсвэл бүх админ эрхээ алдсан үед):

1. Сайтад нэг удаа өөрийн Google эсвэл и-мэйлээр нэвтэрнэ (бүртгэл үүснэ).
2. Өөрийн терминалд (Clerk **Production** Secret key-г нуугдмал асууна, хаана ч хадгалахгүй):
   ```bash
   bun run admin:grant -- <таны-и-мэйл>
   ```
   Скрипт аль instance дээр ажиллаж байгааг бичээд, өөрчлөлтийг Clerk-ээс буцааж уншиж шалгана.
   Идэвхгүй (ban) болсон бүртгэлийг мөн идэвхжүүлнэ.
3. Сайтыг шинэчилнэ: header-т **«Админ»** товч гарна (гар утсанд — цэс → «Админ хэсэг»).
   Нэвтрэх бүрт админ шууд `/admin` руу орно.

**Дараагийн админууд:** тэр хүн сайтад нэг удаа нэвтэрнэ → **Админ → Хэрэглэгчид** → «Админ болгох».

**«Админ» товч гарахгүй / «Танд админ эрх байхгүй» гэж гарвал:**

- Хуудас таны нэвтэрсэн и-мэйлийг харуулна — зөв бүртгэлээр нэвтэрсэн эсэхээ шалгана.
- Сайт эрхийг Clerk-ээс дахин уншдаг тул эрх олгосны дараа ихэвчлэн шууд ажиллана; үгүй бол тэр
  хуудсан дээрх «Гараад дахин нэвтрэх» товч.
- Clerk dashboard → Users → тухайн хүн → **Public metadata** `{"role":"admin"}` байгаа эсэх;
  Sessions → Customize session token `{"role":"{{user.public_metadata.role}}"}` хэвээр эсэх.

Хамгаалалт: админ өөрийгөө хасах, идэвхгүй болгох, устгах боломжгүй; сүүлчийн админыг хасахгүй.
Clerk dashboard болон Cloudflare бүртгэлд хамгийн багадаа 2 хүн (удирдагч + хариуцсан багш) хандах
эрхтэй, 2 шатлалт баталгаажуулалттай байна.

## Админ хэсэг товчоор

- **Элсэлт** — нэр, хичээлийн жил, нээгдэх/хаагдах цаг (УБ), ангиуд, нэмэлт асуулт, багтаамж
  (дүүрвэл хүлээлгийн жагсаалт эсвэл зогсоох). Нээлттэй үед сайтын дээд талд тууз гарна.
- **Өргөдлүүд** — төлөв (Шинэ → Хянаж байна → Ярилцлага → Тэнцсэн / Тэнцээгүй / Хүлээлгийн
  жагсаалт), өргөдөл гаргагчид харагдах мессеж, дотоод тэмдэглэл, CSV. **Тэнцсэн** болгоход гишүүн
  эрх олгогдож, Гишүүд хэсэгт (нийтэд харагдахгүй) мөр үүснэ.
- **Хэрэглэгчид** — хайх, эрх олгох/хасах, идэвхгүй болгох (буцаах боломжтой), бүр мөсөн устгах
  (хувийн мэдээлэл устаж, сайн дурын цаг нэргүйгээр нийт дүнд үлдэнэ).
- **Гишүүд** — нийтэд нэр харуулах нь зөвхөн эцэг эх/асран хамгаалагчийн зөвшөөрөлтэй.
- **Арга хэмжээ → Сайн дурынхан** — ирц; «Ирсэн» гэхэд цаг **Сайн дурын цаг**-т орно (CSV тайланд).
- **Мэдээ, Цомог, Түгээмэл асуулт, Бидний тухай, Сайтын тохиргоо** — бөглөөгүй хэсэг сайт дээр
  харагдахгүй (зохиомол мэдээлэл гарахгүй). Англи талбар хоосон бол монгол текст гарна.
- **Системийн төлөв** — D1/R2/Clerk/webhook/Turnstile; контентын JSON экспорт (хувийн мэдээлэлгүй).
- Товчлол: ⌘K / Ctrl+K хайлт, ⌘S / Ctrl+S хадгалах.

Жилийн тайлан (гишүүд, цаг, үйл ажиллагаа) `private/report-<он>.json`-оос: `bun run report:seed`
→ `bunx wrangler d1 execute DB --remote --file private/seed-report-<он>.sql`. Давтан ажиллуулахад
давхардахгүй, админы засварыг дарахгүй.

## Хувийн мэдээлэл

Хэрэглэгчдийн ихэнх нь **насанд хүрээгүй** сурагчид (дэлгэрэнгүй: `/privacy`).

- Маягт зөвхөн шаардлагатай мэдээллийг авна; Google-ээс зөвхөн нэр, и-мэйл, зураг.
- Өргөдөл, утас, зурвасыг зөвхөн админ харна. Гишүүний нэр нийтэд зөвхөн зөвшөөрөлтэй; хувь хүний
  цаг хэзээ ч нийтэд гарахгүй. Үйлдлийн түүх, логт нэрийн оронд ID бичигдэнэ.
- Тэнцээгүй өргөдөл элсэлт хаагдсанаас N хоногийн (анхдагч 90) дараа автоматаар устна.
- CSV, нөөц файлыг хуваалцахгүй; `private/`, `.dev.vars`-ийг git-д оруулахгүй.

## Дараагийн жилийн удирдлагад хүлээлгэн өгөх

1. Шинэ удирдагч сайтад нэвтэрнэ → Админ → Хэрэглэгчид → **Админ болгох**.
2. Гарч буй хүмүүсийн бүртгэлийг **идэвхгүй** болгоно (устгахгүй — түүх үлдэнэ).
3. Cloudflare (Manage Account → Members), Clerk (Workspace members), код хадгалагдаж буй газар
   (GitHub)-т шинэ хариуцагчийг нэмж, гарч буй хүнийг хасна. Хамгийн багадаа 2 хүн.
4. Хариуцагч солигдсон бол secret-уудыг солино (дээрх «Secret-ууд ба тэдгээрийг солих»).
5. Домэйн `130foreverychild.site`-ийн сунгалтын огноо, төлбөр, хариуцагчийг тэмдэглэнэ.
6. Шинэ хичээлийн жилийн элсэлтийг үүсгэж, жилийн тайлангаа оруулна.
7. Энэ README болон `DEPLOY_CHECKLIST.md`-ийг хамт уншиж, туршилтаар мэдээ нэмж үзнэ.

## Хөгжүүлэгчдэд

- Код, тайлбар, commit message — англиар (Conventional Commits). Сайтын текст `messages/*.json`-д.
- Эрх: хуудас `getAdminAccess()` / `requireAdmin()` / `requireMember()`, Server Action
  `assertAdmin()` / `assertMember()` / `assertSignedIn()` (`src/lib/auth/session.ts`). Middleware
  зөвхөн нэвтэрсэн эсэхийг шалгана; эрхийг D1 (+ Clerk-ээс засвар) шийднэ.
- Clerk зөвхөн `/sign-in`, `/sign-out`, `/join`, `/me`, `/admin`-д ачаалагдана; нийтийн header
  server дээр зурагдана.
- Лог: `logger` (`src/lib/logger.ts`), `console.*` хориотой. Хувийн мэдээлэл биш ID бичнэ.
- Нэвтрэлт/эрхийн өөрчлөлтийн дараа `bun run preview` + `bun run test:e2e`.
