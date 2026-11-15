/** Better Auth paths that could create a user. All are rejected (no public sign-up). */
export const BLOCKED_AUTH_PATHS = /\/api\/auth\/(sign-up|signup|register)(\/|$)/i;

export function isBlockedAuthPath(pathname: string) {
  return BLOCKED_AUTH_PATHS.test(pathname);
}

export function signUpDisabledResponse() {
  return Response.json(
    { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED", message: "Sign-up is disabled" },
    { status: 403 },
  );
}
