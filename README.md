# 130 UNICEF клуб — вэбсайт

130-р сургуулийн **130 UNICEF клуб**-ын албан ёсны вэбсайт (2025 онд байгуулагдсан). Сургууль
дотор болон гадна хүүхдүүдэд туслах, хүүхдийн эрхийг сурталчлах клубын мэдээ, арга хэмжээ, гишүүд,
зургийн цомог, гишүүнчлэлийн өргөдөл болон админ хэсэгтэй.

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
scripts/               seed, админ үүсгэх, OG зураг
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
bun run admin:create -- --email admin@example.com --name "Админ"   # нууц үг хэвлэгдэнэ

bun run dev                     # http://localhost:3000  (админ: /admin/login)
```

Cloudflare Workers орчинтой яг ижил байдлаар туршихдаа:

```bash
bun run preview                 # build + локал workerd (http://localhost:8787)
```

Turnstile болон Google Sheets-ийн түлхүүр байхгүй үед сайт унахгүй: Turnstile туршилтын
түлхүүр ашиглана, Sheets sync-ийг алгасаад log бичнэ.

### Түгээмэл командууд

| Команд                                                          | Үүрэг                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `bun run dev`                                                   | Хөгжүүлэлтийн сервер                                  |
| `bun run check`                                                 | lint + typecheck + format шалгах + тест               |
| `bun run test`                                                  | Тестүүд (`bun test`)                                  |
| `bun run format`                                                | Prettier-ээр форматлах                                |
| `bun run build`                                                 | Next.js production build                              |
| `bun run cf:build`                                              | Cloudflare Worker bundle                              |
| `bun run preview`                                               | Локал Workers preview                                 |
| `bun run db:generate`                                           | `src/db/schema.ts` өөрчилсний дараа migration үүсгэх  |
| `bun run db:migrate:local`                                      | Migration-ийг локал D1 дээр ажиллуулах                |
| `bun run db:seed:local`                                         | Жишээ контент (локал)                                 |
| `bun run db:reset:local`                                        | Локал D1-ийг бүрэн шинэчлэх                           |
| `bun run admin:create -- --email ... [--role editor] [--reset]` | Локал админ үүсгэх / нууц үг шинэчлэх                 |
| `bun run cf-typegen`                                            | `wrangler.jsonc` өөрчилсний дараа төрлүүдийг шинэчлэх |

## Production руу гаргах (deploy)

Алхам алхмаар: **[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)** (D1/R2 үүсгэх, нууц утгууд,
migration, deploy, домэйн холбох, эхний админ).

Товчоор:

```bash
bunx wrangler login
bunx wrangler d1 create unicef-club-130-db        # id-г wrangler.jsonc-д
bunx wrangler r2 bucket create unicef-club-130-media
bunx wrangler r2 bucket create unicef-club-130-opennext-cache
bunx wrangler d1 migrations apply DB --remote
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put TURNSTILE_SECRET_KEY
bun run deploy
```

## Админ хэсгийг ашиглах

Нэвтрэх: `https://<домэйн>/admin/login`. Нийтийн бүртгэл **хаалттай** — шинэ хэрэглэгчийг зөвхөн
админ үүсгэнэ.

| Эрх          | Боломж                                                               |
| ------------ | -------------------------------------------------------------------- |
| **Редактор** | Мэдээ, арга хэмжээ, гишүүд, цомог, өргөдлийн төлөв/тэмдэглэл, зурвас |
| **Админ**    | Бүгд + сайтын тохиргоо, хэрэглэгч удирдах, өргөдөл/зурвас устгах     |

### Шинэ админ / редактор нэмэх

1. Админ → **Хэрэглэгчид** → "Шинэ хэрэглэгч".
2. Нэр, и-мэйл, эрх сонгоно. Нууц үгийг хоосон орхивол автоматаар үүснэ — **нэг л удаа**
   харагдана, хуулж аваад тухайн хүнд аюулгүй замаар өгнө.
3. Нууц үг мартсан бол: Хэрэглэгчид → "Нууц үг шинэчлэх".
4. Клубээс гарсан хүнийг **"Идэвхгүй болгох"** — шууд системээс гарна.

Бүх админ нууц үгээ мартсан бол (production): DEPLOY_CHECKLIST.md → 9-р алхмыг `--reset`
сонголттойгоор хийнэ:
`bun scripts/create-admin.ts --email <и-мэйл> --reset --print-sql > reset.sql` →
`bunx wrangler d1 execute DB --remote --file reset.sql`.

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

- **Лого солих**: `public/logos/school-130.png`, `public/logos/unicef.png` файлыг солиод deploy.
  Файл байхгүй үед автоматаар "лого" гэсэн хоосон хайрцаг харагдана.
- **Өнгө солих**: `src/app/globals.css` → "BRAND PALETTE" хэсэг (бүх өнгө нэг дор).
- **Текст/орчуулга**: `messages/mn.json`, `messages/en.json` (түлхүүрүүд хоёуланд ижил байх ёстой —
  `bun run test` шалгана).
- **Өгөгдлийн бүтэц өөрчлөх**: `src/db/schema.ts` → `bun run db:generate` → `bun run
db:migrate:local` → (production) `bunx wrangler d1 migrations apply DB --remote`.
- **OG зураг** (Facebook-т хуваалцахад харагдах): эх нь `scripts/og/og-default.html`. Chrome-оор
  1200×630 хэмжээтэй нээж screenshot аваад `public/og-default.png`-г солино.
- **Чанар шалгах**: Chrome DevTools → Lighthouse (Mobile) — гол хуудсууд дээр ≥ 90 байхаар.

## Хөгжүүлэгчдэд

- Ажлын дүрэм, шийдвэрүүд: [CLAUDE.md](./CLAUDE.md), явц ба нээлттэй асуултууд:
  [PROGRESS.md](./PROGRESS.md).
- Код, тайлбар, commit message — англиар. Сайтын текст — монголоор (+ англи орчуулга).
- Commit бүрийн өмнө: `bun run check`.
