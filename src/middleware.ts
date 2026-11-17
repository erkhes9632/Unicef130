import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  clerkPublishableKey,
  frontendApiFromPublishableKey,
  signInPathFor,
} from "./lib/auth/clerk";
import { decideAccess, routeArea, toRole } from "./lib/auth/roles";
import { buildCsp, generateNonce, staticSecurityHeaders } from "./lib/security-headers";

// NOTE: Next 16 renamed middleware → proxy (Node runtime). OpenNext Cloudflare only supports
// edge middleware reliably, so we intentionally keep `middleware.ts` (edge).
const intl = createMiddleware(routing);

/** Locale routing applies to public pages only: not admin, API, auth, media, or files. */
const isLocalized = (pathname: string) =>
  !/^\/(api|admin|auth|media|_next)(\/|$)/.test(pathname) && !/\.[^/]+$/.test(pathname);

function withSecurityHeaders(response: Response, csp: string, https: boolean) {
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(staticSecurityHeaders({ https })))
    response.headers.set(name, value);
  return response;
}

/**
 * 1. Clerk reads the session (no network call: the token is verified locally).
 * 2. Role gate: /admin/* → admin, /me/* → member or admin (session-token `role` claim). Pages and
 *    Server Actions check again against D1 — this layer only keeps people out early.
 * 3. Security headers on every response, with a fresh CSP nonce per request (Next.js and Clerk
 *    read it from the request headers and add it to their scripts).
 * 4. next-intl locale routing for public pages.
 */
const withClerk = clerkMiddleware(
  async (auth, request) => {
    const { pathname } = request.nextUrl;
    const https = request.nextUrl.protocol === "https:";
    const nonce = generateNonce();
    const csp = buildCsp({
      nonce,
      dev: process.env.NODE_ENV === "development",
      https,
      clerkFrontendApi: frontendApiFromPublishableKey(clerkPublishableKey()),
    });

    const area = routeArea(pathname);
    if (area !== "public") {
      const { userId, sessionClaims, redirectToSignIn } = await auth();
      const decision = decideAccess(area, {
        signedIn: !!userId,
        role: toRole(sessionClaims?.role),
      });
      if (!decision.allow) {
        const response =
          decision.redirect === "sign-in"
            ? redirectToSignIn({ returnBackUrl: request.url })
            : NextResponse.redirect(new URL(decision.redirect, request.url));
        return withSecurityHeaders(response, csp, https);
      }
    }

    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);

    const response = isLocalized(pathname)
      ? intl(new NextRequest(request, { headers }))
      : NextResponse.next({ request: { headers } });
    return withSecurityHeaders(response, csp, https);
  },
  (request) => {
    const signInUrl = signInPathFor(request.nextUrl.pathname);
    return { publishableKey: clerkPublishableKey(), signInUrl, signUpUrl: signInUrl };
  },
);

/**
 * Without a Clerk key (e.g. a deploy before the secrets are set) the public site keeps working:
 * /admin and /me send everyone home and no Clerk code runs.
 */
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (clerkPublishableKey()) return withClerk(request, event);
  const { pathname } = request.nextUrl;
  const https = request.nextUrl.protocol === "https:";
  const nonce = generateNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development", https });
  if (routeArea(pathname) !== "public")
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)), csp, https);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const response = isLocalized(pathname)
    ? intl(new NextRequest(request, { headers }))
    : NextResponse.next({ request: { headers } });
  return withSecurityHeaders(response, csp, https);
}

export const config = {
  // Everything except build assets (their headers come from public/_headers).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
