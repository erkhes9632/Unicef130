import "server-only";

/**
 * Appends rows to a Google Sheet with a service account, using only fetch + Web Crypto
 * (Workers-compatible; no googleapis package).
 *
 * Config (all optional — when missing, sync is skipped silently):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (PEM, "\n" escapes ok),
 *   GOOGLE_SHEET_ID, GOOGLE_SHEET_TAB (default "Applications").
 * Share the sheet with the service account e-mail (Editor).
 */
export type SheetsConfig = { email: string; privateKey: string; sheetId: string; tab: string };

export function sheetsConfigFromEnv(env: Partial<CloudflareEnv>): SheetsConfig | null {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  if (!email || !privateKey || !sheetId) return null;
  return { email, privateKey, sheetId, tab: env.GOOGLE_SHEET_TAB?.trim() || "Applications" };
}

const b64url = (input: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function pemToPkcs8(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/** Builds and signs a service-account JWT (RS256). Exported for tests. */
export async function createServiceAccountJwt(
  cfg: Pick<SheetsConfig, "email" | "privateKey">,
  nowSec = Math.floor(Date.now() / 1000),
) {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: cfg.email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(cfg.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${b64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number; email: string } | null = null;

async function getAccessToken(cfg: SheetsConfig) {
  if (
    cachedToken &&
    cachedToken.email === cfg.email &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedToken.token;
  }
  const assertion = await createServiceAccountJwt(cfg);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok)
    throw new Error(`Google token error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: cfg.email,
  };
  return data.access_token;
}

/** Appends one row. Values are sent RAW, so text like "=SUM()" is never evaluated as a formula. */
export async function appendSheetRow(cfg: SheetsConfig, row: (string | number)[]) {
  const token = await getAccessToken(cfg);
  const range = encodeURIComponent(`${cfg.tab}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cfg.sheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok)
    throw new Error(`Sheets append error ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
