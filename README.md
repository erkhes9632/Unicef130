# 130 UNICEF клуб — вэбсайт

130-р сургуулийн **130 UNICEF клуб**-ын албан ёсны вэбсайт (2025 онд байгуулагдсан). Сургууль
дотор болон гадна хүүхдүүдэд туслах, хүүхдийн эрхийг сурталчлах клубын мэдээ, арга хэмжээ, гишүүд,
зургийн цомог, гишүүнчлэлийн өргөдөл болон админ хэсэгтэй.

**Production:** https://unicef-club-130.erkhes-labs.workers.dev (админ: `/admin/login`)

- Нийтийн сайт: Монгол (үндсэн) + Англи (`/en`), цайвар/бараан горим, гар утсанд зориулсан.
- Админ хэсэг (`/admin`): мэдээ, арга хэмжээ, гишүүд, цомог, өргөдөл, зурвас, тохиргоо, хэрэглэгчид.

## Технологи

| Хэсэг            | Сонголт                                                         |
| ---------------- | --------------------------------------------------------------- |
| Runtime / багц   | [Bun](https://bun.sh) (`bun`, `bunx` — npm/yarn ашиглахгүй)     |
| Framework        | Next.js 16 (App Router, TypeScript, Server Actions)             |
| Загвар           | Tailwind CSS v4, shadcn/ui, lucide-react, next-themes           |
| Хостинг          | Cloudflare Workers (`@opennextjs/cloudflare` + wrangler)        |
| Өгөгдлийн сан    | Cloudflare D1 + Drizzle ORM                                     |
| Зураг            | Cloudflare R2 (хөтөч дээр WebP болгон багасгаж хуулна)          |
| Нэвтрэлт         | Better Auth (и-мэйл + нууц үг, `admin` / `editor` эрх)          |
| Олон хэл         | next-intl (`messages/mn.json`, `messages/en.json`)              |
| Маягт            | zod + react-hook-form, Cloudflare Turnstile, Google Sheets sync |
| Текст засварлагч | Tiptap                                                          |

## Хавтасны бүтэц

```
src/
  app/[locale]/        нийтийн хуудсууд (mn: /about, en: /en/about)
  app/admin/           админ хэсэг (login + (panel)/...)
  app/api/             auth, зураг upload, .ics
  app/media/           R2 зургийг үзүүлэх
  components/          UI (ui/ = shadcn, admin/, layout/, forms/ ...)
  config/site.ts       сайтын үндсэн тохиргоо, fallback утгууд
  db/schema.ts         D1 хүснэгтүүд (Drizzle)
  i18n/                хэлний тохиргоо
  lib/                 өгөгдөл (data/), баталгаажуулалт, огноо, media, auth ...
messages/              орчуулгууд (mn.json, en.json)
drizzle/migrations/    SQL migration-ууд
scripts/               локал seed, админ үүсгэх, брэнд зураг (OG/favicon)
tests/                 bun test
```

## Локал дээр ажиллуулах

Шаардлага: [Bun](https://bun.sh) ≥ 1.3. Cloudflare бүртгэл **шаардлагагүй** (D1/R2-ийг локалд
дуурайлгана).

```bash
bun install
cp .dev.vars.example .dev.vars
# .dev.vars дотор BETTER_AUTH_SECRET-д шинэ утга оруулна:
openssl rand -base64 32

bun run db:migrate:local        # локал D1 хүснэгтүүд
bun run db:seed:local           # жишээ контент (заавал биш)
bun run admin:create:local -- --email admin@example.com --name "Админ"   # нууц үг хэвлэгдэнэ

bun run dev                     # http://localhost:3000  (админ: /admin/login)
```

Cloudflare Workers орчинтой яг ижил байдлаар туршихдаа:

```bash
bun run preview                 # build + локал workerd (http://localhost:8787)
```

Локал дээр Turnstile болон Google Sheets-ийн түлхүүр шаардлагагүй: Turnstile туршилтын түлхүүр
ашиглана (`.dev.vars` → `NEXTJS_ENV=development`), Sheets sync-ийг чимээгүй алгасна. Production
дээр Turnstile secret байхгүй бол маягтууд татгалзана (spam-аас хамгаалах үүднээс).

### Түгээмэл командууд

| Команд                                                                | Үүрэг                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `bun run dev`                                                         | Хөгжүүлэлтийн сервер                                    |
| `bun run check`                                                       | lint + typecheck + format шалгах + тест                 |
| `bun run test`                                                        | Тестүүд (`bun test`)                                    |
| `bun run format`                                                      | Prettier-ээр форматлах                                  |
| `bun run build`                                                       | Next.js production build                                |
| `bun run cf:build`                                                    | Cloudflare Worker bundle                                |
| `bun run preview`                                                     | Локал Workers preview                                   |
| `bun run db:generate`                                                 | `src/db/schema.ts` өөрчилсний дараа migration үүсгэх    |
| `bun run db:migrate:local`                                            | Migration-ийг локал D1 дээр ажиллуулах                  |
| `bun run db:seed:local`                                               | Жишээ контент (локал)                                   |
| `bun run db:reset:local`                                              | Локал D1-ийг бүрэн шинэчлэх                             |
| `bun run admin:create:local -- --email ... [--role editor] [--reset]` | Локал админ үүсгэх / нууц үг шинэчлэх                   |
| `bun run admin:create -- <и-мэйл>`                                    | **Production** админ үүсгэх (нууц үгийг нууцаар асууна) |
| `bun run db:migrate:remote`                                           | Migration-ийг **production** D1 дээр ажиллуулах         |
| `bun run deploy`                                                      | **Production** руу гаргах                               |
| `bun run cf-typegen`                                                  | `wrangler.jsonc` өөрчилсний дараа төрлүүдийг шинэчлэх   |

## Production (Cloudflare Workers)

Сайт **https://unicef-club-130.erkhes-labs.workers.dev** дээр ажиллаж байна. Deploy нь **гараар**
хийгддэг (CI / автомат deploy байхгүй). Бүх командыг төслийн хавтаснаас ажиллуулна; эхлээд
`bunx wrangler whoami`-аар зөв Cloudflare бүртгэлд нэвтэрсэн эсэхээ шалгана.

| Нөөц              | Нэр                                       |
| ----------------- | ----------------------------------------- |
| Worker            | `unicef-club-130`                         |
| D1 (APAC)         | `unicef-club-130-db` (binding `DB`)       |
| R2 — зураг        | `unicef-club-130-media` (binding `MEDIA`) |
| R2 — OpenNext кэш | `unicef-club-130-opennext-cache`          |

Анхны тохиргооны алхмууд: [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md).

### Дахин deploy хийх

```bash
git pull
bun install
bun run check && bun run build
bun run db:migrate:remote     # шинэ migration байвал (доорхыг үз)
bun run deploy                # build + Cloudflare руу гаргана
```

### Шинэ migration ажиллуулах

1. `src/db/schema.ts`-г өөрчилнө → `bun run db:generate` (шинэ файл `drizzle/migrations/`-д).
2. Локал дээр шалгана: `bun run db:migrate:local` → `bun run dev`.
3. Production: `bunx wrangler d1 migrations list DB --remote` (юу ажиллахыг харна) →
   `bun run db:migrate:remote`.
4. Шинэ кодыг `bun run deploy`. Багана устгах/нэр солих migration-ийг deploy-оос **өмнө** биш,
   хуучин код ашиглахаа больсны дараа ажиллуулна.

⚠️ `bun run db:seed:local` / `scripts/seed.ts` нь жишээ контент — production дээр **ажиллуулахгүй**.

### Нууц утга (secret) нэмэх / солих

Secret-ийг хэзээ ч файлд, git-д, чатад бичихгүй. Утгыг терминал дээр нууцаар асууна:

```bash
bunx wrangler secret list                          # ямар secret байгааг харах (утга харагдахгүй)
bunx wrangler secret put TURNSTILE_SECRET_KEY      # утгыг асууна, оруулахад шууд хүчинтэй
openssl rand -base64 32 | bunx wrangler secret put BETTER_AUTH_SECRET   # шинэ санамсаргүй утга
bunx wrangler secret delete <НЭР>
```

| Нэр                                  | Заавал | Тайлбар                                                  |
| ------------------------------------ | ------ | -------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                 | Тийм   | Нэвтрэлтийн нууц. Солибол бүх хэрэглэгч системээс гарна. |
| `TURNSTILE_SECRET_KEY`               | Тийм   | Turnstile widget-ийн secret key                          |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`       | Үгүй   | Google Sheets sync (бүгд байхгүй бол sync алгасагдана)   |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Үгүй   | Service account JSON-ийн `private_key`                   |
| `GOOGLE_SHEET_ID`                    | Үгүй   | Sheet URL-ийн `/d/<ID>/` хэсэг                           |

Нууц биш тохиргоо (`SITE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`,
`TURNSTILE_SITE_KEY`, `GOOGLE_SHEET_TAB`) нь `wrangler.jsonc` → `"vars"`-д байна; өөрчилсний дараа
`bun run deploy`.

### Production-д админ нэмэх

Ердийн арга: админаар нэвтэрч **Админ → Хэрэглэгчид → "Шинэ хэрэглэгч"**.

Админ огт байхгүй (эсвэл бүгд нууц үгээ мартсан) үед өөрийн терминал дээр:

```bash
bun run admin:create -- <и-мэйл> --name "Нэр"      # --role editor гэж бас болно
```

Script нууц үгийг нуугдмал байдлаар 2 удаа асууна (≥ 12 тэмдэгт), Better Auth-ийн ашигладаг
PBKDF2 hash-аар production D1-д шууд оруулна. Нууц үг/hash нь файл, лог, shell history-д
хадгалагдахгүй. Тухайн и-мэйл аль хэдийн байвал юу ч өөрчлөхгүй. Мартсан нууц үгтэй бүртгэлийг
өөр админ "Нууц үг шинэчлэх"-ээр солино; хэн ч нэвтэрч чадахгүй бол өөр и-мэйлээр шинэ админ үүсгээд
хуучныг нь админ хэсгээс шинэчилнэ.

### Жилийн тайлан оруулах (гишүүд, үйл ажиллагаа, үр дүн)

Тайлангийн түүхий өгөгдөл (гишүүдийн нэр, цаг) **хувийн** тул `private/` хавтсанд хадгалагдана
(`.gitignore`-д орсон, GitHub руу орохгүй). Жишээ: `private/report-2025-2026.json`.

```bash
bun run report:seed                    # private/seed-report-<он>.sql үүсгэнэ (+ тоонуудыг шалгана)
bun run report:seed -- --local         # ...мөн локал D1-д оруулна
bunx wrangler d1 execute DB --remote --file private/seed-report-2025-2026.sql   # production
```

- Дахин ажиллуулахад давхардахгүй. Гишүүд, мэдээ, арга хэмжээ байвал **хөндөхгүй** (админы засвар,
  зураг, зөвшөөрөл хадгалагдана). Үр дүнгийн тоо болон тайлангийн тохиргоо (клубын мэдээлэл, тоон
  үзүүлэлт, хамтрагчид, «Бидний тухай») тайлангийн утгаар **дарагдана**.
- Идэвхтэй гишүүдийн нэр анхнаасаа **нийтэд харагдахгүй**. Зөвшөөрөл авсны дараа Админ → Гишүүд →
  сонгоод «Нэрийг нийтэд харуулах». Хувь хүний сайн дурын цаг сайт дээр хэзээ ч харагдахгүй.
- Дараагийн жилийн тайлан: шинэ JSON (`private/report-2026-2027.json`) → `bun run report:seed --
--file private/report-2026-2027.json`. Эсвэл Админ → **Жилийн үр дүн**-ээс гараар нэмнэ.

### Лог харах

```bash
bunx wrangler tail                       # бодит цагийн лог (Ctrl+C-ээр зогсоно)
bunx wrangler tail --status error        # зөвхөн алдаанууд
```

Эсвэл Cloudflare Dashboard → **Workers & Pages → unicef-club-130 → Observability / Logs**.

### Custom домэйн холбох (дараа нь)

Домэйн Cloudflare дээр DNS-тэй (zone) байх ёстой.

1. Dashboard → **Workers & Pages → unicef-club-130 → Settings → Domains & Routes → Add → Custom
   domain** → `unicef130.mn` (хүсвэл `www.unicef130.mn`-г бас). Эсвэл `wrangler.jsonc` дахь
   `"routes"` мөрийн тайлбарыг авч домэйноо бичнэ.
2. `wrangler.jsonc` → `"vars"`: `SITE_URL`, `BETTER_AUTH_URL`-ийг шинэ домэйн болгож,
   `BETTER_AUTH_TRUSTED_ORIGINS`-д шинэ домэйнийг нэмнэ (таслалаар, workers.dev-г үлдээж болно).
3. Dashboard → **Turnstile** → widget → **Hostname management**-д шинэ домэйнийг нэмнэ.
4. `bun run deploy`. Дараа нь workers.dev URL-ийг хаах бол: Settings → Domains & Routes →
   `workers.dev` → Disable.

## Админ хэсгийг ашиглах

Нэвтрэх: `https://unicef-club-130.erkhes-labs.workers.dev/admin/login`. Нийтийн бүртгэл **хаалттай** — шинэ хэрэглэгчийг зөвхөн
админ үүсгэнэ.

| Эрх          | Боломж                                                               |
| ------------ | -------------------------------------------------------------------- |
| **Редактор** | Мэдээ, арга хэмжээ, гишүүд, цомог, өргөдлийн төлөв/тэмдэглэл, зурвас |
| **Админ**    | Бүгд + сайтын тохиргоо, хэрэглэгч удирдах, өргөдөл/зурвас устгах     |

### Сайтын тохиргоо ба «Бидний тухай» хуудас

Сайт дээр **зохиомол мэдээлэл гарахгүй**: бөглөөгүй талбар, хоосон жагсаалт бүхий хэсэг харагдахгүй.
Англи талбар хоосон бол `/en` дээр монгол текст гарна.

- **Админ → Сайтын тохиргоо** (зөвхөн админ): клубын нэр/танилцуулга/он, лого ба нүүр зураг,
  холбоо барих (хаяг, и-мэйл, утас, цагийн хуваарь, газрын зураг — embed хаяг эсвэл
  өргөрөг/уртраг), сошиал хаягууд, нүүр хуудасны тоон үзүүлэлт (гараар эсвэл D1-ээс автоматаар
  тоолох), хамтрагчид (нэр, лого, холбоос, дараалал), хандивын мэдээлэл, гишүүнчлэлийн маягтын
  сонголтууд.
- **Админ → Бидний тухай хуудас**: танилцуулга, түүх, эрхэм зорилго, үнэт зүйлс, хийдэг ажлууд.
  «Түүх» ба «Хийдэг ажил» нь ноорог текст — шалгаж засаад «Сайт дээр харуулах»-г чагтлах хүртэл
  нийтэд харагдахгүй. Удирдлагын хэсэг нь Гишүүд → «Удирдлага» бүлгээс автоматаар гарна.

### Шинэ админ / редактор нэмэх

1. Админ → **Хэрэглэгчид** → "Шинэ хэрэглэгч".
2. Нэр, и-мэйл, эрх сонгоно. Нууц үгийг хоосон орхивол автоматаар үүснэ — **нэг л удаа**
   харагдана, хуулж аваад тухайн хүнд аюулгүй замаар өгнө.
3. Нууц үг мартсан бол: Хэрэглэгчид → "Нууц үг шинэчлэх".
4. Клубээс гарсан хүнийг **"Идэвхгүй болгох"** — шууд системээс гарна.

Бүх админ нууц үгээ мартсан бол: дээрх "Production-д админ нэмэх" хэсгийг үзнэ.

### Мэдээ нэмэх

1. Админ → **Мэдээ** → "Шинэ мэдээ".
2. Гарчиг, товч агуулга, ангилал, агуулга (засварлагч дээр тод, жагсаалт, холбоос гэх мэт).
3. Slug хоосон бол гарчгаас автоматаар үүснэ (жишээ: «Хүүхдийн эрх» → `khuukhdiin-erkh`).
4. **Нүүр зураг** → "Зураг сонгох" (автоматаар багасгаж, GPS мэдээллийг арилгана).
5. Англи хувилбар заавал биш — хоосон бол `/en` дээр монгол текст харагдана.
6. Төлөв: **Ноорог** (зөвхөн админд) эсвэл **Нийтлэгдсэн**. Ирээдүйн огноо тавьвал тэр цагаас
   харагдана.

Арга хэмжээ, гишүүд, зургийн цомог ижил зарчмаар ажиллана. Зургийн цомогт олон зураг зэрэг
нэмж, дараалал солих, нүүр зураг сонгох боломжтой.

### Өргөдөл ба зурвас

- **Өргөдлүүд**: төлөв (Шинэ / Зөвшөөрсөн / Татгалзсан), дотоод тэмдэглэл, CSV татах (Excel-д
  нээгдэнэ), Google Sheets-д орсон эсэх.
- **Зурвасууд**: "холбоо барих" маягтаар ирсэн захидлууд, уншсан/уншаагүй.

## Хувийн мэдээллийн хамгаалалт (заавал уншина)

Сайтын хэрэглэгчдийн ихэнх нь **насанд хүрээгүй сурагчид**.

- Гишүүнчлэлийн маягт зөвхөн шаардлагатай мэдээллийг авна (нэр, анги, утас, и-мэйл — заавал биш,
  шалтгаан, туслах чиглэл, зөвшөөрөл).
- Гишүүний зургийг **зөвхөн эцэг эх/асран хамгаалагчийн зөвшөөрөлтэй** "Зургийг сайт дээр
  харуулах"-г идэвхжүүлнэ.
- Хэрэгцээгүй болсон өргөдлийг устгана (админ). CSV файлыг хуваалцахдаа болгоомжтой байна.
- Нууц үг, `.dev.vars`, service account JSON-ийг **хэзээ ч** git-д оруулахгүй, чатаар илгээхгүй.

## Дараагийн удирдлагад хүлээлгэн өгөх

Клубын удирдлага солигдох бүрт:

1. ☐ Шинэ удирдагчийг админ → Хэрэглэгчид хэсэгт **Админ** эрхтэй нэмнэ.
2. ☐ Гарч буй хүмүүсийн бүртгэлийг **идэвхгүй** болгоно (устгахгүй — хийсэн үйлдлийн түүх үлдэнэ).
3. ☐ Cloudflare бүртгэлд шинэ удирдагч болон хариуцсан багшийг **Member** болгон нэмнэ
   (Cloudflare → Manage Account → Members). Хамгийн багадаа 2 хүн хандах эрхтэй байх ёстой.
4. ☐ Код хадгалагдаж буй газрын (жишээ нь GitHub) эрхийг шилжүүлнэ.
5. ☐ Домэйний төлбөр, сунгалтын огноо, хариуцагчийг тэмдэглэнэ.
6. ☐ Google Sheet болон service account-ын эзэмшлийг сургуулийн бүртгэл рүү шилжүүлнэ.
7. ☐ Энэ README болон DEPLOY_CHECKLIST.md-ийг хамт уншиж, туршилтаар мэдээ нэмж үзнэ.

## Засвар үйлчилгээ

- **Лого солих**: Админ → **Сайтын тохиргоо → Лого ба нүүр зураг**-аас upload хийнэ (R2, deploy
  хэрэггүй). Эсвэл `public/logos/school-130.png`, `public/logos/unicef.png` файлыг нэмээд
  `bun run brand:assets` → `bun run deploy`. Аль нь ч байхгүй үед "130" тэмдэг харагдана.
- **Өнгө солих**: `src/app/globals.css` → "BRAND PALETTE" хэсэг (бүх өнгө нэг дор).
- **Текст/орчуулга**: `messages/mn.json`, `messages/en.json` (түлхүүрүүд хоёуланд ижил байх ёстой —
  `bun run test` шалгана).
- **Өгөгдлийн бүтэц өөрчлөх**: `src/db/schema.ts` → `bun run db:generate` → `bun run
db:migrate:local` → (production) `bunx wrangler d1 migrations apply DB --remote`.
- **OG зураг, favicon** (Facebook-т хуваалцахад харагдах зураг, хөтчийн icon):
  `bun run brand:assets` — `public/logos/` доторх логоноос `public/og-default.png`,
  `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`-г дахин үүсгэнэ. Лого
  солих бүрт дахин ажиллуулаад deploy хийнэ.
- **Чанар шалгах**: Chrome DevTools → Lighthouse (Mobile) — гол хуудсууд дээр ≥ 90 байхаар.

## Хөгжүүлэгчдэд

- Код, тайлбар, commit message — англиар. Сайтын текст — монголоор (+ англи орчуулга).
- Commit бүрийн өмнө: `bun run check`.
