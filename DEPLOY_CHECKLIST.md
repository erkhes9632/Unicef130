# DEPLOY_CHECKLIST — Production руу гаргах алхмууд

> Энэ жагсаалтын командуудыг **хөгжүүлэгч өөрөө** ажиллуулна. Төслийн код (AI туслах ч мөн)
> хэзээ ч deploy, `--remote`, `wrangler secret put` зэргийг автоматаар ажиллуулдаггүй.
>
> Бүх командыг төслийн хавтаснаас (`unicef-club-130/`) ажиллуулна. Багцын менежер нь **Bun**.

Тэмдэглэгээ: ☐ = хийх, ✅ = хийсэн. `<...>` хэсгийг өөрийн утгаар солино.

---

## 0. Урьдчилсан бэлтгэл

- ☐ Cloudflare бүртгэл (клубын/сургуулийн нэр дээр, хэд хэдэн хүн хандах эрхтэй байхаар).
- ☐ Домэйн нэр шийдсэн (жишээ нь `unicef130.mn`). Домэйн Cloudflare дээр (DNS) байх ёстой.
- ☐ Локал дээр бүх шалгалт ногоон:
  ```bash
  bun install
  bun run check        # lint + typecheck + format + test
  bun run build        # Next.js production build
  bun run cf:build     # Cloudflare Worker bundle (.open-next/)
  ```
- ☐ Лого файлууд байрандаа: `public/logos/school-130.png`, `public/logos/unicef.png`.
- ☐ (Заавал биш) `public/og-default.png`-г логотой болгож дахин үүсгэх (README → "OG зураг").

## 1. Cloudflare-д нэвтрэх

```bash
bunx wrangler login
bunx wrangler whoami      # зөв бүртгэл (account) сонгогдсоныг шалгана
```

## 2. D1 өгөгдлийн сан үүсгэх

```bash
bunx wrangler d1 create unicef-club-130-db
```

- ☐ Гарсан `database_id`-г `wrangler.jsonc` → `d1_databases[0].database_id`-д тавина
  (`00000000-0000-0000-0000-000000000000`-г солино).

## 3. R2 bucket-ууд үүсгэх

```bash
bunx wrangler r2 bucket create unicef-club-130-media
bunx wrangler r2 bucket create unicef-club-130-opennext-cache
```

- ☐ Нэр өөр бол `wrangler.jsonc` → `r2_buckets`-ийг тааруулна.

## 4. Migration-ийг production D1 дээр ажиллуулах

```bash
bunx wrangler d1 migrations apply DB --remote
```

## 5. Production тохиргоо (vars) — `wrangler.jsonc`

`wrangler.jsonc`-ийн доод хэсэгт байгаа `"vars"` блокийн тайлбарыг (`//`) авч, утгуудыг бөглөнө:

| Нэр                           | Жишээ                                           | Тайлбар                                       |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `SITE_URL`                    | `https://unicef130.mn`                          | SEO, sitemap, хуваалцах холбоос               |
| `BETTER_AUTH_URL`             | `https://unicef130.mn`                          | Нэвтрэх систем                                |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://unicef130.mn,https://www.unicef130.mn` | Таслалаар                                     |
| `TURNSTILE_SITE_KEY`          | `0x4AAAA...`                                    | Turnstile widget-ийн **site key** (нийтэд ил) |
| `GOOGLE_SHEET_TAB`            | `Applications`                                  | Google Sheet-ийн tab нэр                      |

## 6. Нууц утгууд (secrets)

```bash
# 1) Нэвтрэх системийн нууц (шинээр үүсгэнэ, локалын .dev.vars-ийнхыг БҮҮ ашигла)
openssl rand -base64 32
bunx wrangler secret put BETTER_AUTH_SECRET

# 2) Cloudflare Turnstile (Dashboard → Turnstile → Add widget → домэйнээ нэмнэ)
bunx wrangler secret put TURNSTILE_SECRET_KEY

# 3) Google Sheets (заавал биш — тохируулахгүй бол өргөдөл зөвхөн admin дээр хадгалагдана)
bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # JSON доторх "private_key" утга бүхлээр
bunx wrangler secret put GOOGLE_SHEET_ID                       # Sheet URL-ийн /d/<ID>/ хэсэг
```

> ⚠️ Turnstile тохируулаагүй бол сайт Cloudflare-ийн **туршилтын** түлхүүрийг ашиглана — энэ нь
> spam хамгаалалтгүй гэсэн үг. Production-д заавал тохируулна.

### Google Sheets бэлтгэх (нэг удаа)

1. ☐ Google Cloud Console → шинэ project → **Google Sheets API**-г идэвхжүүлнэ.
2. ☐ IAM → Service Accounts → шинэ service account → **Keys → Add key → JSON** татна.
3. ☐ Google Sheet үүсгээд, service account-ын и-мэйлд **Editor** эрхээр share хийнэ.
4. ☐ Tab-ын нэрийг `Applications` болгож, 1-р мөрөнд гарчгууд бичнэ:
   `Огноо | Овог нэр | Анги | Утас | И-мэйл | Шалтгаан | Туслах чиглэл | Төлөв | ID`
5. ☐ JSON файлыг хаа нэгтээ хадгалахгүй, secret болгож оруулсны дараа устгана.

## 7. Deploy хийх

```bash
bun run deploy          # = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

- ☐ Bundle хэмжээ: одоогоор gzip-ээр ~2 MB (Workers Free-ийн хязгаар 3 MB). Хэтэрвэл Workers Paid
  ($5/сар) руу шилжих эсвэл хамаарлыг багасгана.
- ☐ Deploy-ийн дараа `https://unicef-club-130.<account>.workers.dev` нээгдэж байгааг шалгана.

## 8. Custom domain холбох

Аль нэг аргаар:

- Dashboard: Workers & Pages → `unicef-club-130` → Settings → Domains & Routes → **Add → Custom
  domain** → `unicef130.mn` (мөн `www.`).
- Эсвэл `wrangler.jsonc` дахь `"routes"` мөрийн тайлбарыг авч дахин `bun run deploy`.

- ☐ Turnstile widget-ийн Hostname жагсаалтад домэйнээ нэмсэн эсэх.
- ☐ `SITE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` нь шинэ домэйнтэй таарч байгаа эсэх.

## 9. Эхний админ үүсгэх

```bash
# SQL файл үүсгэнэ (нууц үг терминалд нэг удаа харагдана — хадгалж ав!)
bun scripts/create-admin.ts --email <admin@example.com> --name "<Нэр>" --print-sql > admin.sql
bunx wrangler d1 execute DB --remote --file admin.sql
rm admin.sql
```

- ☐ `https://<домэйн>/admin/login` руу нэвтэрч, нууц үгээ шалгана.
- ☐ Админ → Хэрэглэгчид хэсгээс бусад редакторуудыг нэмнэ.

## 10. Контент

- ☐ (Заавал биш) Жишээ контент оруулах: `bun scripts/seed.ts --print-sql > seed.sql` →
  `bunx wrangler d1 execute DB --remote --file seed.sql` → `rm seed.sql`.
  Жишээ контент ашиглахгүй бол энэ алхмыг алгасна.
  ⚠️ `seed.sql` нь мэдээ, арга хэмжээ, гишүүд, цомог, тохиргоог **устгаад** дахин бичдэг — зөвхөн
  хоосон, шинэ өгөгдлийн сан дээр ажиллуулна.
- ☐ Админ → **Сайтын тохиргоо**: хаяг (мн/en), утас, и-мэйл, цагийн хуваарь, Google Maps embed,
  сошиал хаягууд, нүүр хуудасны тоо, хандивын холбоос.
- ☐ Гишүүд, мэдээ, арга хэмжээ, зургийн цомгоо оруулна (хүүхдийн зургийг зөвшөөрөлтэй).
- ☐ PROGRESS.md → "TODO(content)" жагсаалтыг дуусгана.

## 11. Эцсийн шалгалт

- ☐ `/`, `/en`, `/news`, `/events`, `/join`, `/contact` нээгдэж байна.
- ☐ Гишүүнчлэлийн маягт илгээж үзэх → Админ → Өргөдлүүд дээр харагдана → (тохируулсан бол) Google
  Sheet-д мөр нэмэгдэнэ.
- ☐ Холбоо барих маягт → Админ → Зурвасууд.
- ☐ Админаас зураг upload хийж үзэх (R2).
- ☐ `https://<домэйн>/sitemap.xml`, `/robots.txt` зөв домэйнтэй.
- ☐ Google Search Console-д sitemap бүртгүүлэх (заавал биш).
- ☐ Cloudflare Dashboard → Workers → Logs (observability) дээр алдаа байхгүй.

## Дараагийн deploy-ууд

```bash
git pull                      # хамгийн сүүлийн код
bun install
bun run check
bunx wrangler d1 migrations apply DB --remote   # шинэ migration байвал
bun run deploy
```
