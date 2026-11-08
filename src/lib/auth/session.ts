import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@/db/schema";
import { getAuth } from "./index";
import { hasRole, isRole } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Session user for this request (deduplicated per render), or null. Disabled users → null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const u = result.user as typeof result.user & { role?: unknown; banned?: unknown };
  if (u.banned) return null;
  return { id: u.id, name: u.name, email: u.email, role: isRole(u.role) ? u.role : "editor" };
});

/** For admin pages/layouts: redirects to the login page when not signed in. */
export async function requireUser(required: UserRole = "editor"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!hasRole(user.role, required)) redirect("/admin?forbidden=1");
  return user;
}

export class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
    this.name = "AuthError";
  }
}

/**
 * For Server Actions: every mutating action must call this first.
 * Throws AuthError (never trust the UI to hide buttons).
 */
export async function requireRole(required: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (!hasRole(user.role, required)) throw new AuthError("forbidden");
  return user;
}
