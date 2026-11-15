import { getAuth } from "@/lib/auth";
import { isBlockedAuthPath, signUpDisabledResponse } from "@/lib/auth/signup-guard";

/**
 * Better Auth HTTP handler (sign-in, sign-out, session).
 * Public sign-up is closed twice: `disableSignUp` in the config, and here every sign-up path is
 * rejected before Better Auth parses the body (an invalid body also gets "disabled", never a
 * validation error). Users are created only in /admin/users and by scripts/create-admin.ts.
 */
async function handler(request: Request) {
  if (isBlockedAuthPath(new URL(request.url).pathname)) return signUpDisabledResponse();
  const auth = await getAuth();
  return auth.handler(request);
}

export { handler as GET, handler as POST };
