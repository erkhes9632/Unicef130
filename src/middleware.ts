import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { buildCsp, generateNonce, staticSecurityHeaders } from "./lib/security-headers";

// NOTE: Next 16 renamed middleware → proxy (Node runtime). OpenNext Cloudflare only supports
// edge middleware reliably, so we intentionally keep `middleware.ts` (edge).
const intl = createMiddleware(routing);

/** Locale routing applies to public pages only: not admin, API, media, or files with an extension. */
const isLocalized = (pathname: string) =>
  !/^\/(api|admin|media|_next)(\/|$)/.test(pathname) && !/\.[^/]+$/.test(pathname);

/**
 * 1. Sets the security headers on every response, with a fresh CSP nonce per request. The nonce
 *    travels to the app in the request headers (Next.js reads it from the CSP header and adds it
 *    to its scripts; the root layout passes it to the theme script).
 * 2. Runs next-intl's locale routing for public pages.
 */
export default function middleware(request: NextRequest) {
  const https = request.nextUrl.protocol === "https:";
  const nonce = generateNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development", https });

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const response = isLocalized(request.nextUrl.pathname)
    ? intl(new NextRequest(request, { headers }))
    : NextResponse.next({ request: { headers } });

  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(staticSecurityHeaders({ https })))
    response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except build assets (their headers come from public/_headers).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
