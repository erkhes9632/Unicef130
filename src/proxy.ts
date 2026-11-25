import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  clerkPublishableKey,
  frontendApiFromPublishableKey,
  signInPathFor,
} from "./lib/auth/clerk";
import { decideAccess, routeArea } from "./lib/auth/roles";
import { buildCsp, staticSecurityHeaders } from "./lib/security-headers";

/**
 * Runs ONLY for the account areas (see `config.matcher`): public pages are cached HTML and never
 * reach this code (Free plan: 10 ms CPU per request). Locale prefixes and the public security
 * headers come from next.config.ts.
 *
 * 1. Clerk reads the session (verified locally, no network call).
 * 2. /admin/* and /me/* need a session (→ sign-in with a return address). Roles are checked by
 *    the pages and Server Actions against D1 (see `decideAccess`).
 * 3. Security headers with a CSP that also allows Clerk's Frontend API.
 */
function withSecurityHeaders(response: Response, https: boolean) {
  const csp = buildCsp({
    dev: process.env.NODE_ENV === "development",
    https,
    clerkFrontendApi: frontendApiFromPublishableKey(clerkPublishableKey()),
  });
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(staticSecurityHeaders({ https })))
    response.headers.set(name, value);
  return response;
}

/** /join without a session → the cached visitor view (the address bar keeps /join). */
const JOIN = /^\/(?:(en|mn)\/)?join$/;
const guestJoin = (request: NextRequest, locale: string | undefined) =>
  NextResponse.rewrite(new URL(`/${locale ?? "mn"}/join/guest`, request.url));

const withClerk = clerkMiddleware(
  async (auth, request) => {
    const https = request.nextUrl.protocol === "https:";
    const join = JOIN.exec(request.nextUrl.pathname);
    if (join && !(await auth()).userId)
      return withSecurityHeaders(guestJoin(request, join[1]), https);
    const area = routeArea(request.nextUrl.pathname);
    if (area !== "public") {
      const { userId, redirectToSignIn } = await auth();
      if (!decideAccess(area, { signedIn: !!userId }).allow)
        return withSecurityHeaders(redirectToSignIn({ returnBackUrl: request.url }), https);
    }
    return withSecurityHeaders(NextResponse.next(), https);
  },
  (request) => {
    const signInUrl = signInPathFor(request.nextUrl.pathname);
    return { publishableKey: clerkPublishableKey(), signInUrl, signUpUrl: signInUrl };
  },
);

/** Without a Clerk key the public site keeps working: /admin and /me send everyone home. */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (clerkPublishableKey()) return withClerk(request, event);
  const https = request.nextUrl.protocol === "https:";
  if (routeArea(request.nextUrl.pathname) !== "public")
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)), https);
  const join = JOIN.exec(request.nextUrl.pathname);
  if (join) return withSecurityHeaders(guestJoin(request, join[1]), https);
  return withSecurityHeaders(NextResponse.next(), https);
}

export const config = {
  // Account areas only. "mn/" because OpenNext applies the locale rewrite (/join → /mn/join)
  // before the proxy. Everything else is served without running this function.
  matcher: [
    "/admin/:path*",
    "/me/:path*",
    "/(en|mn)/me/:path*",
    "/join",
    "/(en|mn)/join",
    "/sign-in/:path*",
    "/(en|mn)/sign-in/:path*",
    "/sign-out",
    "/(en|mn)/sign-out",
    "/auth/:path*",
    "/api/admin/:path*",
  ],
};
