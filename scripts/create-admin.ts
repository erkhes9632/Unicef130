/**
 * Creates an account — or resets its password — directly in D1. Production by default.
 *
 *   bun run admin:create -- <email> [--name "Нэр"] [--role admin]     create (refuses if it exists)
 *   bun run admin:create -- <email> --reset [--role admin]            break-glass password reset
 *   bun run admin:create:local -- <email> [...]                       same, against the LOCAL D1
 *
 * - The password is typed at a hidden prompt (twice, min 12 characters); it never appears in the
 *   command line, shell history, files or logs.
 * - It is hashed with the same PBKDF2 function the app uses (src/lib/auth/password.ts). Production
 *   writes use parameterized queries through the Cloudflare D1 REST API with the token of the
 *   logged-in wrangler session (kept in memory only).
 * - `--reset` asks to retype the email, then sets the new password, re-enables the account, signs
 *   out all its sessions, clears the login lockout and removes two-factor (to be enrolled again).
 *   The role changes only if `--role` is given.
 * - `--password-stdin` (LOCAL only, for automated test setup) reads the password from stdin.
 *
 * Requires an interactive terminal and, for production, `bunx wrangler login` (D1 write access).
 */
import { parseArgs } from "node:util";
import { userRoles } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearTwoFactorStatements,
  createStatements,
  findUserStatement,
  inlineParams,
  normalizeEmail,
  passwordProblem,
  resetStatements,
  type Statement,
} from "./lib/admin-account";

const DATABASE_NAME = "unicef-club-130-db";
const API = "https://api.cloudflare.com/client/v4";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    name: { type: "string" },
    role: { type: "string" },
    reset: { type: "boolean", default: false },
    local: { type: "boolean", default: false },
    "password-stdin": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`✘ ${message}`);
  process.exit(1);
}

const email = normalizeEmail(positionals[0]);
if (!email) {
  fail(
    `Usage: bun run admin:create -- <email> [--name "Нэр"] [--role ${userRoles.join("|")}] [--reset]`,
  );
}
if (values.role !== undefined && !(userRoles as readonly string[]).includes(values.role))
  fail(`--role must be one of: ${userRoles.join(", ")}`);
const fromStdin = values["password-stdin"];
if (fromStdin && !values.local) fail("--password-stdin is only allowed together with --local.");
if (!fromStdin && !process.stdin.isTTY)
  fail("Run this in an interactive terminal (the password is not read from a pipe).");

/** Reads one line from the terminal; `hidden` turns echo off. */
function readLine(prompt: string, hidden: boolean): Promise<string> {
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
        if (ch === "\u007f" || ch === "\b") {
          if (!hidden && input.length > 0) process.stdout.write("\b \b");
          input = input.slice(0, -1);
        } else if (ch >= " ") {
          input += ch;
          if (!hidden) process.stdout.write(ch);
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function askPassword(): Promise<string> {
  if (fromStdin) {
    const password = (await Bun.stdin.text()).replace(/\r?\n$/, "");
    const problem = passwordProblem(password, password);
    if (problem) fail(problem);
    return password;
  }
  const password = await readLine("Password (min 12 characters, hidden): ", true);
  const problem = passwordProblem(password, await readLine("Repeat password: ", true));
  if (problem) fail(problem);
  return password;
}

// ---------------------------------------------------------------------------
// Query executors: Cloudflare D1 REST API (production) or the wrangler CLI (local)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Exec = (statement: Statement) => Promise<Row[]>;

async function remoteExec(): Promise<Exec> {
  const proc = Bun.spawn(["bunx", "wrangler", "auth", "token", "--json"], {
    stdout: "pipe",
    stderr: "ignore",
    stdin: "ignore",
  });
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) fail("Could not get a wrangler token. Run: bunx wrangler login");
  let token = "";
  try {
    token = (JSON.parse(out) as { token?: string }).token ?? "";
  } catch {
    // handled below
  }
  if (!token) fail("Unexpected output from `wrangler auth token`. Run: bunx wrangler login");

  type CfResponse<T> = { success: boolean; result: T; errors?: { message: string }[] };
  const cf = async <T>(path: string, init?: RequestInit): Promise<T> => {
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
  };

  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    const accounts = await cf<{ id: string }[]>("/accounts");
    if (accounts.length !== 1)
      fail("Several Cloudflare accounts found — set CLOUDFLARE_ACCOUNT_ID.");
    accountId = accounts[0]!.id;
  }
  const dbs = await cf<{ uuid: string; name: string }[]>(
    `/accounts/${accountId}/d1/database?name=${encodeURIComponent(DATABASE_NAME)}`,
  );
  const db = dbs.find((d) => d.name === DATABASE_NAME);
  if (!db) fail(`D1 database "${DATABASE_NAME}" not found in this account.`);

  return async (statement) => {
    const result = await cf<{ results: Row[] }[]>(
      `/accounts/${accountId}/d1/database/${db.uuid}/query`,
      { method: "POST", body: JSON.stringify(statement) },
    );
    return result[0]?.results ?? [];
  };
}

const localExec: Exec = async (statement) => {
  const proc = Bun.spawn(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--json",
      "--command",
      inlineParams(statement),
    ],
    { stdout: "pipe", stderr: "pipe", stdin: "ignore" },
  );
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) throw new Error(`wrangler d1 execute failed: ${err || out}`);
  return (JSON.parse(out) as { results: Row[] }[])[0]?.results ?? [];
};

// ---------------------------------------------------------------------------

const exec = values.local ? localExec : await remoteExec();
const target = values.local ? "LOCAL D1" : `production D1 (${DATABASE_NAME})`;
const [existing] = await exec(findUserStatement(email));
const now = Date.now();

if (values.reset) {
  if (!existing) fail(`No user with email ${email} — nothing changed.`);
  console.log(
    `Break-glass reset in ${target}: "${String(existing.name)}" <${email}>, role ${String(existing.role)}` +
      (values.role ? ` → ${values.role}` : "") +
      ". All sessions of this account will be signed out.",
  );
  if (!fromStdin) {
    const typed = await readLine("Type the email again to confirm: ", false);
    if (typed.trim().toLowerCase() !== email) fail("Confirmation did not match — nothing changed.");
  }
  const password = await askPassword();
  const hash = await hashPassword(password);
  if (!(await verifyPassword({ hash, password }))) fail("Password hash self-check failed.");
  for (const statement of resetStatements({
    userId: String(existing.id),
    email,
    hash,
    now,
    role: values.role,
    accountId: crypto.randomUUID(),
    logId: crypto.randomUUID(),
  })) {
    await exec(statement);
  }
  try {
    for (const statement of clearTwoFactorStatements(String(existing.id))) await exec(statement);
    console.log("   Two-factor was cleared: set it up again after logging in.");
  } catch {
    // Database from before two-factor existed: nothing to clear.
  }
  console.log(`✅ Password reset for ${email}. Log in at /admin/login.`);
} else {
  if (existing) fail(`A user with email ${email} already exists — nothing changed (use --reset).`);
  const role = values.role ?? "admin";
  const name = values.name?.trim() || "Админ";
  console.log(`Creating ${role} "${name}" <${email}> in ${target}.`);
  const password = await askPassword();
  const hash = await hashPassword(password);
  if (!(await verifyPassword({ hash, password }))) fail("Password hash self-check failed.");
  const statements = createStatements({
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    name,
    email,
    role,
    hash,
    now,
  });
  await exec(statements.user);
  try {
    await exec(statements.account);
  } catch (err) {
    await exec(statements.rollback); // do not leave a user without a password
    fail(err instanceof Error ? err.message : String(err));
  }
  console.log(`✅ Created ${role} account: ${email}. Log in at /admin/login.`);
}
