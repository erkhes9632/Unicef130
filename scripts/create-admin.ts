/**
 * Creates an admin (or editor) account in the PRODUCTION D1 database.
 *
 *   bun scripts/create-admin.ts <email> [--name "Нэр"] [--role admin|editor]
 *
 * - The password is typed at a hidden prompt (twice, min 12 characters); it never appears in the
 *   command line, shell history, files or logs.
 * - It is hashed with the same PBKDF2 function the app's Better Auth config uses
 *   (src/lib/auth/password.ts) and inserted with parameterized queries through the Cloudflare D1
 *   REST API, using the token of the logged-in wrangler session (kept in memory only).
 * - Refuses to run if a user with that email already exists.
 *
 * Requires: `bunx wrangler login` (D1 write access) in an interactive terminal.
 * Local development accounts: `bun run admin:create:local` (scripts/create-admin-local.ts).
 */
import { parseArgs } from "node:util";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const DATABASE_NAME = "unicef-club-130-db";
const MIN_PASSWORD_LENGTH = 12;
const API = "https://api.cloudflare.com/client/v4";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    name: { type: "string", default: "Админ" },
    role: { type: "string", default: "admin" },
  },
});

function fail(message: string): never {
  console.error(`✘ ${message}`);
  process.exit(1);
}

const email = positionals[0]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Usage: bun scripts/create-admin.ts <email> [--name "Нэр"] [--role admin|editor]');
}
if (values.role !== "admin" && values.role !== "editor") fail('--role must be "admin" or "editor"');
const name = values.name!.trim();
if (!name) fail("--name must not be empty");
if (!process.stdin.isTTY)
  fail("Run this in an interactive terminal (the password is not read from a pipe).");

/** Reads a line from the terminal without echoing it. */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let input = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") input = input.slice(0, -1);
        else if (ch >= " ") input += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function getToken(): Promise<string> {
  const proc = Bun.spawn(["bunx", "wrangler", "auth", "token", "--json"], {
    stdout: "pipe",
    stderr: "ignore",
    stdin: "ignore",
  });
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) fail("Could not get a wrangler token. Run: bunx wrangler login");
  try {
    const token = (JSON.parse(out) as { token?: string }).token;
    if (token) return token;
  } catch {
    // fall through
  }
  fail("Unexpected output from `wrangler auth token`. Run: bunx wrangler login");
}

type CfResponse<T> = { success: boolean; result: T; errors?: { message: string }[] };

async function cf<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = (await res.json()) as CfResponse<T>;
  if (!res.ok || !data.success) {
    throw new Error(
      `Cloudflare API error (${res.status}): ${data.errors?.map((e) => e.message).join("; ")}`,
    );
  }
  return data.result;
}

const token = await getToken();

let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!accountId) {
  const accounts = await cf<{ id: string; name: string }[]>(token, "/accounts");
  if (accounts.length !== 1) fail("Several Cloudflare accounts found — set CLOUDFLARE_ACCOUNT_ID.");
  accountId = accounts[0]!.id;
}
const dbs = await cf<{ uuid: string; name: string }[]>(
  token,
  `/accounts/${accountId}/d1/database?name=${encodeURIComponent(DATABASE_NAME)}`,
);
const db = dbs.find((d) => d.name === DATABASE_NAME);
if (!db) fail(`D1 database "${DATABASE_NAME}" not found in this account.`);

async function query<T = Record<string, unknown>>(sql: string, params: string[] = []) {
  const result = await cf<{ results: T[]; success: boolean }[]>(
    token,
    `/accounts/${accountId}/d1/database/${db!.uuid}/query`,
    { method: "POST", body: JSON.stringify({ sql, params }) },
  );
  return result[0]?.results ?? [];
}

const existing = await query(`SELECT "id" FROM "user" WHERE lower("email") = ?1 LIMIT 1`, [email]);
if (existing.length > 0) fail(`A user with email ${email} already exists — nothing changed.`);

console.log(`Creating ${values.role} "${name}" <${email}> in production D1 (${DATABASE_NAME}).`);
const password = await readHidden(`Password (min ${MIN_PASSWORD_LENGTH} characters): `);
if (password.length < MIN_PASSWORD_LENGTH)
  fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
const again = await readHidden("Repeat password: ");
if (again !== password) fail("Passwords do not match.");

const hash = await hashPassword(password);
if (!(await verifyPassword({ hash, password }))) fail("Password hash self-check failed.");

const userId = crypto.randomUUID();
const now = String(Date.now());

await query(
  `INSERT INTO "user" ("id", "name", "email", "email_verified", "role", "banned", "created_at", "updated_at")
   VALUES (?1, ?2, ?3, 1, ?4, 0, CAST(?5 AS INTEGER), CAST(?5 AS INTEGER))`,
  [userId, name, email, values.role!, now],
);
try {
  await query(
    `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
     VALUES (?1, ?2, 'credential', ?2, ?3, CAST(?4 AS INTEGER), CAST(?4 AS INTEGER))`,
    [crypto.randomUUID(), userId, hash, now],
  );
} catch (err) {
  await query(`DELETE FROM "user" WHERE "id" = ?1`, [userId]); // roll back the half-created user
  fail(err instanceof Error ? err.message : String(err));
}

console.log(`✅ Created ${values.role} account: ${email}`);
console.log("   Log in at /admin/login on the production site.");
