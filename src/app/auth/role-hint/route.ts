import { NextResponse, type NextRequest } from "next/server";
import { roleHintCookie } from "@/lib/auth/role-hint";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Refreshes the header's display-only role hint (lib/auth/role-hint.ts) when a signed-in visitor
 * has none, e.g. after signing in with a return address. Called at most once per browser session.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const role = user ? (user.role ?? "applicant") : null;
  const response = NextResponse.json({ role }, { headers: { "Cache-Control": "no-store" } });
  response.headers.append(
    "Set-Cookie",
    roleHintCookie(role, request.nextUrl.protocol === "https:"),
  );
  return response;
}
