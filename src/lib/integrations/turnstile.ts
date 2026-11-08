import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare Turnstile. When keys are not configured, Cloudflare's official *test* keys are used
 * (they always pass), so local development works without any account.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export async function getTurnstileSiteKey() {
  const { env } = await getCloudflareContext({ async: true });
  return env.TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
}

let warned = false;

export async function verifyTurnstile(token: unknown, remoteIp?: string | null): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const { env } = await getCloudflareContext({ async: true });
  const secret = env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET_KEY;
  if (!env.TURNSTILE_SECRET_KEY && !warned) {
    warned = true;
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — using Cloudflare test secret (always passes).",
    );
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.info("[turnstile] verification failed", data["error-codes"]);
    return data.success === true;
  } catch (err) {
    // Offline local development with test keys: don't block the form.
    if (!env.TURNSTILE_SECRET_KEY) {
      console.warn("[turnstile] siteverify unreachable, allowing (test keys only)", err);
      return true;
    }
    console.error("[turnstile] siteverify request failed", err);
    return false;
  }
}
