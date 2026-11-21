/**
 * Step 3 of the yearly report import: applies private/import-<year>.sql to D1 and syncs the
 * photos in private/r2-upload-list.txt to R2 (`content/` prefix).
 *
 *   bun run report:import -- --local                  # parse → build → apply to the LOCAL D1/R2
 *   bun scripts/report/run-import.ts --local --dry-run
 *   bun scripts/report/run-import.ts --remote --confirm-production   # see README → Yearly report
 *
 * - R2: uploads objects that are missing or changed (md5 = etag), then deletes objects under
 *   `content/` that the import no longer references. Other prefixes are only reported.
 * - --remote refuses to run without --confirm-production and a backup in private/backups/ that is
 *   less than 60 minutes old (`bunx wrangler d1 export DB --remote --output private/backups/…`).
 * - Before and after: row counts per table; the run fails if the number of users changed.
 * Output: counts and keys only, never names.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import { CONTENT_PREFIX, MEDIA_BUCKET } from "./lib";

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    local: { type: "boolean", default: false },
    remote: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "confirm-production": { type: "boolean", default: false },
    year: { type: "string", default: "2025-2026" },
  },
});
if (args.local === args.remote) fail("Pass exactly one of --local or --remote.");
const target = args.remote ? "--remote" : "--local";
const dryRun = args["dry-run"]!;
const SQL_FILE = `private/import-${args.year}.sql`;
const BACKUP_DIR = "private/backups";
const BACKUP_MAX_AGE_MS = 60 * 60 * 1000;

function fail(message: string): never {
  console.error(`✘ ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Production guard
// ---------------------------------------------------------------------------

if (args.remote && !dryRun) {
  if (!args["confirm-production"]) fail("--remote needs --confirm-production.");
  const fresh = (() => {
    try {
      return readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => statSync(`${BACKUP_DIR}/${f}`))
        .some((s) => s.size > 0 && Date.now() - s.mtimeMs < BACKUP_MAX_AGE_MS);
    } catch {
      return false;
    }
  })();
  if (!fresh)
    fail(
      `No backup from the last 60 minutes in ${BACKUP_DIR}/. Run first:\n  bunx wrangler d1 export DB --remote --output ${BACKUP_DIR}/before-import-$(date +%F-%H%M).sql`,
    );
}

// ---------------------------------------------------------------------------
// Wrangler helpers
// ---------------------------------------------------------------------------

async function run(cmd: string[], { quiet = false } = {}) {
  const proc = Bun.spawn(["bunx", "wrangler", ...cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) fail(`wrangler ${cmd.slice(0, 3).join(" ")} failed:\n${err || out}`);
  if (!quiet) process.stdout.write(out);
  return out;
}

async function query<T>(sql: string): Promise<T[]> {
  const out = await run(["d1", "execute", "DB", target, "--json", "--command", sql], {
    quiet: true,
  });
  return (JSON.parse(out.slice(out.indexOf("["))) as { results: T[] }[])[0]!.results;
}

const TABLES = [
  "users",
  "applications",
  "recruitment_periods",
  "event_signups",
  "volunteer_hours",
  "activity_log",
  "rate_limit",
  "contact_messages",
  "faqs",
  "settings",
  "news",
  "events",
  "albums",
  "images",
  "impact_stats",
  "slug_redirects",
  "members",
];
async function counts() {
  // One SELECT with sub-queries (D1 limits compound SELECTs).
  const [row] = await query<Record<string, number>>(
    `SELECT ${TABLES.map((t) => `(SELECT count(*) FROM "${t}") AS "${t}"`).join(", ")}, (SELECT count(*) FROM "members" WHERE "user_id" IS NOT NULL) AS "members_linked"`,
  );
  return row!;
}

type R2Object = { key: string; etag: string };
async function listR2(): Promise<R2Object[]> {
  if (args.local) {
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<CloudflareEnv>();
    try {
      const all: R2Object[] = [];
      let cursor: string | undefined;
      do {
        const page = await proxy.env.MEDIA.list({ cursor, limit: 1000 });
        all.push(...page.objects.map((o) => ({ key: o.key, etag: o.etag })));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return all;
    } finally {
      await proxy.dispose();
    }
  }
  // Remote: Cloudflare REST API (read-only GET) with wrangler's own login.
  const token = (await run(["auth", "token"], { quiet: true })).trim().split("\n").at(-1)!;
  const api = (path: string) =>
    fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { authorization: `Bearer ${token}` },
    }).then(
      (r) =>
        r.json() as Promise<{
          success: boolean;
          result: unknown;
          result_info?: { cursor?: string };
        }>,
    );
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ??
    ((await api("/accounts")).result as { id: string }[])[0]?.id ??
    fail("No Cloudflare account found for the wrangler login.");
  const all: R2Object[] = [];
  let cursor = "";
  do {
    const page = await api(
      `/accounts/${accountId}/r2/buckets/${MEDIA_BUCKET}/objects?per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    if (!page.success) fail("Listing R2 objects failed.");
    all.push(
      ...(page.result as { key: string; etag?: string }[]).map((o) => ({
        key: o.key,
        etag: (o.etag ?? "").replace(/"/g, ""),
      })),
    );
    cursor = page.result_info?.cursor ?? "";
  } while (cursor);
  return all;
}

/** Every /media/… URL the database still points at (to report orphans outside content/). */
async function referencedKeys() {
  const sources = [
    `"images"."url"`,
    `"images"."thumb_url"`,
    `"news"."cover_url"`,
    `"events"."cover_url"`,
    `"albums"."cover_url"`,
    `"members"."photo_url"`,
    `"settings"."value"`,
  ];
  // Scalar sub-queries (D1 rejects long UNION chains).
  const [row] = await query<Record<string, string | null>>(
    `SELECT ${sources.map((s, i) => `(SELECT group_concat(${s}, ' ') FROM ${s.split(".")[0]}) AS c${i}`).join(", ")}`,
  );
  const keys = new Set<string>();
  for (const text of Object.values(row ?? {}))
    for (const m of (text ?? "").matchAll(/\/media\/([a-z]+\/[\w/.-]+)/g)) keys.add(m[1]!);
  return keys;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const sql = readFileSync(SQL_FILE, "utf8");
const uploads = readFileSync("private/r2-upload-list.txt", "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [file, key, md5] = line.split("\t");
    return { file: file!, key: key!, md5: md5! };
  });
const wanted = new Set(uploads.map((u) => u.key));
for (const u of uploads)
  if (!u.key.startsWith(CONTENT_PREFIX)) fail(`Upload key outside ${CONTENT_PREFIX}: ${u.key}`);

console.log(
  `Target: ${args.remote ? "PRODUCTION (remote)" : "local"}${dryRun ? " — dry run" : ""}`,
);
// The SQL writes images.alt_en (migration 0009): stop before anything is written if it's missing.
const [schema] = await query<{ altEn: number }>(
  `SELECT count(*) AS altEn FROM pragma_table_info('images') WHERE name = 'alt_en'`,
);
if (!schema?.altEn)
  fail(
    `images.alt_en is missing: run the migrations first (bun run db:migrate:${args.remote ? "remote" : "local"}).`,
  );
const before = await counts();

// User-linked rows are kept by the SQL (WHERE clauses). Make that visible, and stop if a kept
// event would clash with a new slug.
const [linked] = await query<{ signups: number; hours: number; slugClash: number }>(
  `SELECT (SELECT count(*) FROM "event_signups") AS signups, (SELECT count(*) FROM "volunteer_hours" WHERE "event_id" IS NOT NULL OR "member_id" IS NOT NULL) AS hours, (SELECT count(*) FROM "events" e WHERE (e."id" IN (SELECT "event_id" FROM "event_signups") OR e."id" IN (SELECT "event_id" FROM "volunteer_hours" WHERE "event_id" IS NOT NULL)) AND e."id" NOT LIKE 'e____-__' AND e."slug" IN (${[...sql.matchAll(/INSERT INTO "events" \([^)]*\) VALUES \('[^']*', '([^']*)'/g)].map((m) => `'${m[1]}'`).join(", ") || "''"})) AS slugClash`,
);
if (linked!.slugClash > 0)
  fail(
    "A user-linked event that is kept has the same slug as an imported one. Resolve in admin first.",
  );
if (linked!.signups || linked!.hours)
  console.log(
    `ℹ️  ${linked!.signups} event sign-ups and ${linked!.hours} logged-hour rows exist: the events/members they point to are kept, not deleted.`,
  );

const existing = await listR2();
const etags = new Map(existing.map((o) => [o.key, o.etag]));
const toUpload = uploads.filter((u) => etags.get(u.key) !== u.md5);
const toDelete = existing
  .filter((o) => o.key.startsWith(CONTENT_PREFIX) && !wanted.has(o.key))
  .map((o) => o.key);

console.log("\nRows before:");
console.table(before);
console.log(
  `R2: ${existing.length} objects · upload ${toUpload.length} (missing/changed) · delete ${toDelete.length} unreferenced under ${CONTENT_PREFIX}`,
);
for (const k of toDelete) console.log(`  − ${k}`);

if (dryRun) {
  console.log(`\nDry run: nothing written. SQL: ${SQL_FILE}.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Apply: D1 first (one batch), then R2
// ---------------------------------------------------------------------------

await run(["d1", "execute", "DB", target, "--file", SQL_FILE, "--yes"], { quiet: true });
console.log(`\n✅ D1: ${SQL_FILE} applied.`);

for (const u of toUpload) {
  await run(
    [
      "r2",
      "object",
      "put",
      `${MEDIA_BUCKET}/${u.key}`,
      "--file",
      u.file,
      "--content-type",
      "image/webp",
      "--cache-control",
      "public, max-age=31536000, immutable",
      target,
    ],
    { quiet: true },
  );
  console.log(`  ↑ ${u.key}`);
}
for (const key of toDelete) {
  await run(["r2", "object", "delete", `${MEDIA_BUCKET}/${key}`, target], { quiet: true });
  console.log(`  − ${key}`);
}
console.log(`✅ R2: ${toUpload.length} uploaded, ${toDelete.length} deleted.`);

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

const after = await counts();
console.log("\nRows before → after:");
console.table(
  Object.fromEntries(Object.keys(after).map((k) => [k, { before: before[k], after: after[k] }])),
);
const kept = [
  "users",
  "applications",
  "recruitment_periods",
  "event_signups",
  "volunteer_hours",
  "rate_limit",
  "contact_messages",
  "faqs",
  "members_linked",
];
const changed = kept.filter((k) => before[k] !== after[k]);
if (changed.length) fail(`Kept tables changed: ${changed.join(", ")}`);

const refs = await referencedKeys();
const finalObjects = await listR2();
const missing = [...refs].filter(
  (k) => k.startsWith(CONTENT_PREFIX) && !finalObjects.some((o) => o.key === k),
);
if (missing.length) fail(`Referenced but missing in R2: ${missing.join(", ")}`);
const orphans = finalObjects
  .filter((o) => !o.key.startsWith(CONTENT_PREFIX) && !refs.has(o.key))
  .map((o) => o.key);
if (orphans.length)
  console.log(
    `ℹ️  ${orphans.length} R2 objects outside ${CONTENT_PREFIX} are not referenced (left as is):\n${orphans.map((k) => `  · ${k}`).join("\n")}`,
  );
console.log("\n✅ Import verified: kept tables unchanged, every referenced photo is in R2.");
