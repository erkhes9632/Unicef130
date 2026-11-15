import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { findUser, mirrorFromClerk, upsertUser } from "@/lib/users/sync";
import { clerkPublishableKey } from "./clerk";
import { SIGN_IN_PATH, toRole, type AppRole } from "./roles";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole | null;
  twoFactorEnabled: boolean;
  applyBlocked: boolean;
};

/** Fetches the user from Clerk and refreshes the D1 mirror (lazy upsert / drift repair). */
export async function refreshUserFromClerk(userId: string) {
  const client = await clerkClient();
  const mirror = mirrorFromClerk(await client.users.getUser(userId));
  if (!mirror) return null;
  return upsertUser(await getDb(), mirror);
}

/**
 * The signed-in user for this request (deduplicated per render), or null.
 *
 * The D1 row decides (it changes the moment an admin acts, while the session token's `role`
 * claim can lag up to a minute). When the row is missing (webhook not delivered yet) or the
 * claim disagrees with it, the user is fetched from Clerk once and the row is repaired.
 * Banned users are treated as signed out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Clerk not configured: nobody is signed in (public pages keep working).
  if (!clerkPublishableKey()) return null;
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const db = await getDb();
  let row = await findUser(db, userId);
  if (!row || row.role !== toRole(sessionClaims?.role)) row = await refreshUserFromClerk(userId);
  if (!row || row.banned) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: toRole(row.role),
    twoFactorEnabled: row.twoFactorEnabled,
    applyBlocked: row.applyBlocked,
  };
});

// ---- Pages and layouts: redirect ------------------------------------------------------------

/** Admin pages: not signed in → sign-in, anyone but an admin → home. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Member area (/me): members and admins. An applicant is sent to /join. */
export async function requireMember(locale: "mn" | "en" = "mn"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const prefix = locale === "en" ? "/en" : "";
  if (!user) redirect(`${prefix}${SIGN_IN_PATH}`);
  if (!user.role) redirect(`${prefix}/join`);
  return user;
}

// ---- Server Actions and route handlers: throw ------------------------------------------------

export class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
    this.name = "AuthError";
  }
}

/** Every admin write calls this first (never trust the UI to hide buttons). */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (user.role !== "admin") throw new AuthError("forbidden");
  return user;
}

/** Member-area writes (profile, event sign-up). */
export async function assertMember(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (!user.role) throw new AuthError("forbidden");
  return user;
}

/** Any signed-in account (submitting an application, deleting one's own account). */
export async function assertSignedIn(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  return user;
}
