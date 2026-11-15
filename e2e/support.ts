import { execFileSync } from "node:child_process";
import { createClerkClient } from "@clerk/backend";

/** Clerk Backend API for the DEVELOPMENT instance only (refuses production keys). */
export function devClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";
  if (!secretKey.startsWith("sk_test_"))
    throw new Error("E2E needs the Development instance secret key (sk_test_) in .dev.vars");
  return createClerkClient({ secretKey });
}

export const E2E = {
  admin: "e2e-admin+clerk_test@example.com",
  admin2: "e2e-admin2+clerk_test@example.com",
  applicant: "e2e-applicant+clerk_test@example.com",
} as const;

export async function findUser(email: string) {
  const { data } = await devClerk().users.getUserList({ emailAddress: [email] });
  return data[0] ?? null;
}

/** Creates (or resets) a test account with the given role. */
export async function ensureUser(email: string, role: "admin" | "member" | null, firstName = "") {
  const clerk = devClerk();
  const existing = await findUser(email);
  if (!existing)
    return clerk.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      publicMetadata: role ? { role } : {},
    });
  if (existing.banned) await clerk.users.unbanUser(existing.id);
  return clerk.users.updateUserMetadata(existing.id, { publicMetadata: { role } });
}

export async function deleteUser(email: string) {
  const u = await findUser(email);
  if (u) await devClerk().users.deleteUser(u.id);
}

/** SQL against the LOCAL D1 (the preview's database) through wrangler. */
export function localSql(sql: string) {
  execFileSync("bunx", ["wrangler", "d1", "execute", "DB", "--local", "--command", sql], {
    stdio: "pipe",
  });
}
