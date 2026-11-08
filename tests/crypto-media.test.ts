import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createServiceAccountJwt, sheetsConfigFromEnv } from "@/lib/integrations/google-sheets";
import { sniffImageType } from "@/lib/media/server";

describe("password hashing (PBKDF2)", () => {
  test("hash/verify round trip, unique salts", async () => {
    const h1 = await hashPassword("correct horse battery");
    const h2 = await hashPassword("correct horse battery");
    expect(h1).not.toBe(h2);
    expect(h1.startsWith("pbkdf2$sha256$100000$")).toBe(true);
    expect(await verifyPassword({ hash: h1, password: "correct horse battery" })).toBe(true);
    expect(await verifyPassword({ hash: h1, password: "wrong" })).toBe(false);
    expect(await verifyPassword({ hash: "scrypt$garbage", password: "x" })).toBe(false);
    expect(await verifyPassword({ hash: "pbkdf2$sha256$1$a$b", password: "x" })).toBe(false);
  });
});

describe("image sniffing", () => {
  test("detects by magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png",
    );
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});

describe("google sheets service account", () => {
  test("config requires all three values; un-escapes \\n in the key", () => {
    expect(sheetsConfigFromEnv({})).toBeNull();
    expect(
      sheetsConfigFromEnv({ GOOGLE_SERVICE_ACCOUNT_EMAIL: "a", GOOGLE_SHEET_ID: "b" }),
    ).toBeNull();
    const cfg = sheetsConfigFromEnv({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "a",
      GOOGLE_SHEET_ID: "b",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "x\\ny",
    });
    expect(cfg?.privateKey).toBe("x\ny");
    expect(cfg?.tab).toBe("Applications");
  });
  test("JWT is RS256-signed and verifiable", async () => {
    const kp = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----`;
    const jwt = await createServiceAccountJwt(
      { email: "svc@x.iam.gserviceaccount.com", privateKey: pem },
      1_800_000_000,
    );
    const [h, p, s] = jwt.split(".") as [string, string, string];
    const dec = (x: string) =>
      Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    expect(
      await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        kp.publicKey,
        dec(s),
        new TextEncoder().encode(`${h}.${p}`),
      ),
    ).toBe(true);
    const claims = JSON.parse(new TextDecoder().decode(dec(p)));
    expect(claims).toMatchObject({
      iss: "svc@x.iam.gserviceaccount.com",
      aud: "https://oauth2.googleapis.com/token",
      exp: 1_800_003_600,
    });
  });
});
