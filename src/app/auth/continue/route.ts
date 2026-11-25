import { NextResponse, type NextRequest } from "next/server";
import { roleHintCookie } from "@/lib/auth/role-hint";
import { homePathFor, SIGN_IN_PATH } from "@/lib/auth/roles";
import { getFreshUser } from "@/lib/auth/session";

/**
 * Landing address after sign-in (when no return address was given): admin → /admin,
 * member → /me, applicant → /join. The role is read from Clerk once here (and mirrored to D1), so
 * a role granted while the person was signed out — or a missed webhook — can't send them the
 * wrong way.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "mn";
  const user = await getFreshUser();
  const target = user
    ? homePathFor(user.role, locale)
    : `${locale === "en" ? "/en" : ""}${SIGN_IN_PATH}`;
  const response = NextResponse.redirect(new URL(target, request.url));
  // Display-only hint for the cached public header (see lib/auth/role-hint.ts).
  response.headers.append(
    "Set-Cookie",
    roleHintCookie(user ? (user.role ?? "applicant") : null, request.nextUrl.protocol === "https:"),
  );
  return response;
}
