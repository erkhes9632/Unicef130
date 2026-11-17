import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { logger } from "@/lib/logger";

/**
 * Cloudflare Turnstile.
 * - Local development (NEXTJS_ENV=development in .dev.vars): missing keys fall back to Cloudflare's
 *   official *test* keys (they always pass), so forms work without an account.
 * - Production: test keys are refused. If the real site key or secret is missing (or is a test
 *   key), forms are reported as "temporarily unavailable" and every submission is rejected.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** Cloudflare's published dummy keys: 1x/2x/3x + zeros (+ AA/AB/BB/FF suffixes). */
export function isTestSiteKey(key: string) {
  return /^[123]x0{20}[A-F]{2}$/.test(key.trim());
}
export function isTestSecretKey(key: string) {
  return /^[123]x0{31}[A-F]{2}$/.test(key.trim());
}

type TurnstileConfig =
  | { status: "ok"; siteKey: string; secret: string }
  | { status: "test"; siteKey: string; secret: string } // local development only
  | { status: "unavailable"; reason: string };

type Env = { NEXTJS_ENV?: string; TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string };

/** Pure decision (exported for tests). */
export function resolveTurnstileConfig(env: Env): TurnstileConfig {
  const isDev = env.NEXTJS_ENV === "development";
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() ?? "";
  const secret = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (isDev) {
    return {
      status: "test",
      siteKey: siteKey || TURNSTILE_TEST_SITE_KEY,
      secret: secret || TURNSTILE_TEST_SECRET_KEY,
    };
  }
  if (!siteKey) return { status: "unavailable", reason: "TURNSTILE_SITE_KEY is not set" };
  if (isTestSiteKey(siteKey))
    return { status: "unavailable", reason: "TURNSTILE_SITE_KEY is a Cloudflare test key" };
  if (!secret) return { status: "unavailable", reason: "TURNSTILE_SECRET_KEY is not set" };
  if (isTestSecretKey(secret))
    return { status: "unavailable", reason: "TURNSTILE_SECRET_KEY is a Cloudflare test key" };
  return { status: "ok", siteKey, secret };
}

let warned = false;
async function getConfig(): Promise<TurnstileConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const cfg = resolveTurnstileConfig(env as Env);
  if (cfg.status === "unavailable" && !warned) {
    warned = true;
    logger.error("turnstile", "forms disabled in production", { reason: cfg.reason });
  }
  return cfg;
}

/** Site key for the widget, or null when forms are unavailable (production misconfiguration). */
export async function getTurnstileSiteKey(): Promise<string | null> {
  const cfg = await getConfig();
  return cfg.status === "unavailable" ? null : cfg.siteKey;
}

type TurnstileResult = "ok" | "failed" | "unavailable";

export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const cfg = await getConfig();
  if (cfg.status === "unavailable") return "unavailable";
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return "failed";

  const body = new FormData();
  body.append("secret", cfg.secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success)
      logger.info("turnstile", "verification failed", { codes: data["error-codes"] });
    return data.success === true ? "ok" : "failed";
  } catch (err) {
    // Offline local development with test keys: don't block the form.
    if (cfg.status === "test") {
      logger.warn("turnstile", "siteverify unreachable, allowing (test keys only)", err);
      return "ok";
    }
    logger.error("turnstile", "siteverify request failed", err);
    return "failed";
  }
}
