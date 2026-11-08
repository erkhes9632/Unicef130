/**
 * Password hashing with Web Crypto PBKDF2-SHA256 (native on Workers and Bun).
 * Better Auth's default scrypt runs in pure JS and can exceed the Workers CPU limit.
 * Format: pbkdf2$sha256$<iterations>$<saltBase64>$<hashBase64>
 */
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [scheme, algo, iter, saltB64, hashB64] = hash.split("$");
  if (scheme !== "pbkdf2" || algo !== "sha256" || !iter || !saltB64 || !hashB64) return false;
  const iterations = Number(iter);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 1_000_000) return false;
  const expected = unb64(hashB64);
  const actual = await derive(password, unb64(saltB64), iterations);
  if (actual.length !== expected.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}
