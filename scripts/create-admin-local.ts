/**
 * Creates (or resets) an admin/editor account in the LOCAL D1 database.
 *
 *   bun run admin:create:local -- --email admin@example.com --name "Админ" [--password "..."] [--role admin|editor] [--reset]
 *
 * Without --password a strong random password is generated and printed once.
 * Production: use scripts/create-admin.ts (hidden password prompt, remote D1).
 */
import { parseArgs } from "node:util";
import { hashPassword } from "@/lib/auth/password";
import { insert, runLocalSql, sqlValue } from "./lib/sql";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    email: { type: "string" },
    name: { type: "string", default: "Админ" },
    password: { type: "string" },
    role: { type: "string", default: "admin" },
    reset: { type: "boolean", default: false },
    "print-sql": { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    "Usage: bun run admin:create:local -- --email you@example.com [--name ...] [--password ...]",
  );
  process.exit(1);
}
if (values.role !== "admin" && values.role !== "editor") {
  console.error('--role must be "admin" or "editor"');
  process.exit(1);
}

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const password = values.password ?? randomPassword();
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const userId = crypto.randomUUID();
const hash = await hashPassword(password);
const now = Date.now();
const statements: string[] = [];

if (values.reset) {
  // Update an existing user's password + role, and sign out all their sessions.
  statements.push(
    `UPDATE "account" SET "password" = ${sqlValue(hash)}, "updated_at" = ${now} WHERE "provider_id" = 'credential' AND "user_id" = (SELECT "id" FROM "user" WHERE "email" = ${sqlValue(email)});`,
    `UPDATE "user" SET "role" = ${sqlValue(values.role)}, "banned" = 0, "updated_at" = ${now} WHERE "email" = ${sqlValue(email)};`,
    `DELETE FROM "session" WHERE "user_id" = (SELECT "id" FROM "user" WHERE "email" = ${sqlValue(email)});`,
  );
} else {
  statements.push(
    insert("user", {
      id: userId,
      name: values.name!,
      email,
      email_verified: true,
      role: values.role,
      banned: false,
      created_at: now,
      updated_at: now,
    }),
    insert("account", {
      id: crypto.randomUUID(),
      account_id: userId,
      provider_id: "credential",
      user_id: userId,
      password: hash,
      created_at: now,
      updated_at: now,
    }),
  );
}

if (values["print-sql"]) {
  // For the developer's production setup (DEPLOY_CHECKLIST.md). Not executed here.
  // SQL → stdout (redirect to a file); the generated password → stderr (shown in the terminal).
  console.log(statements.join("\n"));
  if (!values.password)
    console.error(`🔑 Generated password for ${email} (shown once): ${password}`);
  process.exit(0);
}

await runLocalSql(statements, "create-admin");
console.log(
  `\n✅ ${values.reset ? "Reset" : "Created"} ${values.role} account in LOCAL D1: ${email}`,
);
if (!values.password) console.log(`🔑 Generated password (shown once): ${password}`);
