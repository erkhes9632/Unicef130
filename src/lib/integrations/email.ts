import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Optional transactional email (feature flag): active only when both RESEND_API_KEY (secret) and
 * EMAIL_FROM (var, e.g. "UNICEF клуб <no-reply@example.mn>") are set. Without them every caller
 * falls back to showing a copyable link, and nothing is sent.
 */
async function config() {
  const { env } = await getCloudflareContext({ async: true });
  const { RESEND_API_KEY: key, EMAIL_FROM: from } = env;
  return key && from ? { key, from } : null;
}

export async function isEmailConfigured() {
  return (await config()) !== null;
}

/** Sends a plain-text email. Returns false (never throws) when not configured or on failure. */
export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const cfg = await config();
  if (!cfg) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from, ...message }),
    });
    if (!res.ok) console.error("[email] provider rejected the message", res.status);
    return res.ok;
  } catch (err) {
    console.error("[email] request failed", err);
    return false;
  }
}
