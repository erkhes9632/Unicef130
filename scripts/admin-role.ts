/**
 * Grants or revokes the admin role via the Clerk Backend API (role = publicMetadata.role).
 *
 *   bun run admin:grant  -- person@example.com          # asks for the Clerk secret key (hidden)
 *   bun run admin:revoke -- person@example.com
 *   bun run admin:grant  -- person@example.com --dev    # Development instance key from .dev.vars
 *
 * The person must have signed in to the site once (that creates their Clerk account). The D1
 * mirror follows through the webhook, or on their next request. The secret key is never
 * printed or stored. Granting also lifts a ban (break-glass: an admin who was locked out).
 */
import { createClerkClient } from "@clerk/backend";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  instanceOf,
  isEmail,
  planRoleChange,
  type ClerkUserLite,
  type RoleCommand,
} from "./lib/admin-role";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: { dev: { type: "boolean", default: false } },
  allowPositionals: true,
});
const [rawCommand, rawEmail] = positionals;
if (rawCommand !== "grant" && rawCommand !== "revoke")
  fail("Usage: admin-role.ts grant|revoke <email>");
const command: RoleCommand = rawCommand;
const email = (rawEmail ?? "").trim().toLowerCase();
if (!isEmail(email))
  fail("Give the person's e-mail address, e.g. bun run admin:grant -- me@gmail.com");

/** Reads one line from the terminal with echo off. */
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

async function secretKey(): Promise<string> {
  if (values.dev) {
    if (!existsSync(".dev.vars")) fail(".dev.vars not found (run from the project folder).");
    const line = readFileSync(".dev.vars", "utf8")
      .split(/\r?\n/)
      .find((l) => /^\s*CLERK_SECRET_KEY\s*=/.test(l));
    const key =
      line
        ?.split("=")
        .slice(1)
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "") ?? "";
    if (instanceOf(key) !== "development")
      fail("CLERK_SECRET_KEY in .dev.vars is not an sk_test_ key.");
    return key;
  }
  if (process.env.CLERK_SECRET_KEY) return process.env.CLERK_SECRET_KEY.trim();
  if (!process.stdin.isTTY) fail("Run this in an interactive terminal (the key is typed hidden).");
  console.log("Clerk dashboard → (Production instance) → API keys → Secret key.");
  return (await readHidden("Clerk secret key (hidden): ")).trim();
}

const key = await secretKey();
const instance = instanceOf(key);
if (!instance) fail("That does not look like a Clerk secret key (sk_live_… or sk_test_…).");
const clerk = createClerkClient({ secretKey: key });

async function listAll(): Promise<ClerkUserLite[]> {
  const out: ClerkUserLite[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await clerk.users.getUserList({ limit: 100, offset });
    out.push(...(page.data as unknown as ClerkUserLite[]));
    if (page.data.length < 100) return out;
  }
}

const found = (await clerk.users.getUserList({ emailAddress: [email] }))
  .data as unknown as ClerkUserLite[];
const target =
  found[0] ??
  fail(
    `No Clerk account for ${email} on the ${instance} instance. Sign in to the site once first.`,
  );

const decision = planRoleChange(command, target, command === "revoke" ? await listAll() : []);
const plan = "refuse" in decision ? fail(`Not changed: ${decision.refuse}.`) : decision;
if (plan.action === "unban-and-set-admin") await clerk.users.unbanUser(target.id);
await clerk.users.updateUserMetadata(target.id, {
  publicMetadata: { role: plan.action === "remove-admin" ? null : "admin" },
});
console.log(
  `✓ ${email} ${plan.action === "remove-admin" ? "is no longer an admin" : "is now an admin"} (${instance} instance).`,
);
console.log("  The change reaches the site within a minute (or sign out and in again).");
