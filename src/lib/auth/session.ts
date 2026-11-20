import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { findUser, mirrorFromClerk, upsertUser } from "@/lib/users/sync";
import { clerkPublishableKey } from "./clerk";
import { SIGN_IN_PATH, toRole, type AppRole } from "./roles";

type CurrentUser = {
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

type UserRow = NonNullable<Awaited<ReturnType<typeof findUser>>>;

function toCurrentUser(row: UserRow | null): CurrentUser | null {
  if (!row || row.banned) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: toRole(row.role),
    twoFactorEnabled: row.twoFactorEnabled,
    applyBlocked: row.applyBlocked,
  };
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
  return toCurrentUser(row);
});

/**
 * Same as `getCurrentUser`, but always asks Clerk (one Backend API call). Used where a stale
 * mirror would send someone the wrong way: right after sign-in, and before telling a signed-in
 * person they lack a role (the role may have been granted a moment ago, or the webhook missed).
 */
export async function getFreshUser(): Promise<CurrentUser | null> {
  if (!clerkPublishableKey()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  try {
    return toCurrentUser(await refreshUserFromClerk(userId));
  } catch {
    // Clerk unreachable: fall back to the mirror.
    return getCurrentUser();
  }
}

// ---- Pages and layouts: redirect ------------------------------------------------------------

export type AdminAccess =
  | { status: "signed-out" }
  | { status: "admin"; user: CurrentUser }
  | { status: "forbidden"; user: CurrentUser };

/**
 * Who may see the admin panel (the /admin layout renders a "no admin rights" page instead of a
 * silent redirect). A non-admin is re-checked against Clerk first, so a role granted a moment
 * ago works without signing out.
 */
export async function getAdminAccess(): Promise<AdminAccess> {
  let user = await getCurrentUser();
  if (!user) return { status: "signed-out" };
  if (user.role !== "admin") user = (await getFreshUser()) ?? user;
  return user.role === "admin" ? { status: "admin", user } : { status: "forbidden", user };
}

/**
 * Admin pages: not signed in → sign-in; anyone else → /admin, whose layout explains that the
 * account has no admin rights. (The layout already stops non-admins; this is defence in depth.)
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const access = await getAdminAccess();
  if (access.status === "signed-out") redirect(SIGN_IN_PATH);
  if (access.status === "forbidden") redirect("/admin");
  return access.user;
}

/**
 * Member area (/me): members and admins. An applicant is re-checked against Clerk (an approval
 * a moment ago counts) and otherwise sent to /join, which shows the application status.
 */
export async function requireMember(locale: "mn" | "en" = "mn"): Promise<CurrentUser> {
  let user = await getCurrentUser();
  const prefix = locale === "en" ? "/en" : "";
  if (!user) redirect(`${prefix}${SIGN_IN_PATH}`);
  if (!user.role) user = (await getFreshUser()) ?? user;
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
