import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Signed "form rendered at" timestamp. The join page embeds it in the form; on submit the server
 * verifies the signature and measures how long filling the form took. The client cannot forge an
 * earlier time, so scripts that post instantly are caught (minimum fill time, spam score).
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function hmac(message: string) {
  const { env } = await getCloudflareContext({ async: true });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`form-token:${env.BETTER_AUTH_SECRET}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function issueFormToken(now: number = Date.now()) {
  return `${now}.${await hmac(String(now))}`;
}

/** Milliseconds since the form was rendered, or null for a missing / forged / stale token. */
export async function formAgeMs(token: unknown, now: number = Date.now()): Promise<number | null> {
  if (typeof token !== "string" || token.length > 120) return null;
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d{13}$/.test(ts)) return null;
  if ((await hmac(ts)) !== sig) return null;
  const age = now - Number(ts);
  return age >= 0 && age <= MAX_AGE_MS ? age : null;
}

/** Salted hash of a network address: lets us rate-limit and block without storing the address. */
export async function hashIp(ip: string | null) {
  return (await hmac(`ip:${ip ?? "unknown"}`)).slice(0, 32);
}
