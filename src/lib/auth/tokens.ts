/**
 * One-time link tokens (invitations, password resets). Pure helpers: the raw token only ever
 * lives in the link shown to the admin; the database stores its SHA-256 hash.
 */
export const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

/** 32 random bytes, base64url (43 characters). */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type TokenState = "valid" | "used" | "expired" | "missing";

export function tokenState(
  row: { usedAt: Date | null; expiresAt: Date } | undefined | null,
  now: number = Date.now(),
): TokenState {
  if (!row) return "missing";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= now) return "expired";
  return "valid";
}
