import { NextResponse, type NextRequest } from "next/server";
import { homePathFor, SIGN_IN_PATH } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Landing address after sign-in (when no return address was given): admin → /admin,
 * member → /me, applicant → /join. The role comes from D1 (repaired from Clerk if needed).
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "mn";
  const user = await getCurrentUser();
  const target = user
    ? homePathFor(user.role, locale)
    : `${locale === "en" ? "/en" : ""}${SIGN_IN_PATH}`;
  return NextResponse.redirect(new URL(target, request.url));
}
