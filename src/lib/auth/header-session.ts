import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { clerkPublishableKey } from "./clerk";
import type { AppRole } from "./roles";
import { getCurrentUser } from "./session";

export type HeaderSession = { signedIn: boolean; role: AppRole | null };

/**
 * Sign-in state for the public header (desktop control + mobile menu), read once per request.
 * The role comes from D1 like every server check (not the token claim, which can lag), so the
 * "Админ" link appears as soon as the role is granted. Links only help navigation: each page
 * still checks the role itself.
 */
export const getHeaderSession = cache(async (): Promise<HeaderSession | null> => {
  if (!clerkPublishableKey()) return null;
  try {
    const { userId } = await auth();
    if (!userId) return { signedIn: false, role: null };
    const user = await getCurrentUser();
    return { signedIn: true, role: user?.role ?? null };
  } catch {
    // No Clerk context for this request (e.g. a static error page): show the sign-in link.
    return { signedIn: false, role: null };
  }
});
