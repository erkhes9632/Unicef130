import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { isBlockedAuthPath } from "@/lib/auth/signup-guard";
import { isBlocked, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS } from "@/lib/auth/login-limit";
import {
  isTestSecretKey,
  isTestSiteKey,
  resolveTurnstileConfig,
} from "@/lib/integrations/turnstile";

describe("Turnstile production key guard", () => {
  const realSite = "0x4AAAAAAAB1cDeFgHiJkLmN";
  const realSecret = "0x4AAAAAAAB1cDeFgHiJkLmN_secretValue123";

  test("recognises Cloudflare's dummy keys", () => {
    for (const k of [
      "1x00000000000000000000AA",
      "2x00000000000000000000AB",
      "3x00000000000000000000FF",
      "1x00000000000000000000BB",
    ])
      expect(isTestSiteKey(k)).toBe(true);
    for (const k of [
      "1x0000000000000000000000000000000AA",
      "2x0000000000000000000000000000000AA",
      "3x0000000000000000000000000000000AA",
    ])
      expect(isTestSecretKey(k)).toBe(true);
    expect(isTestSiteKey(realSite)).toBe(false);
    expect(isTestSecretKey(realSecret)).toBe(false);
  });

  test("production refuses missing or test keys (forms unavailable)", () => {
    expect(resolveTurnstileConfig({}).status).toBe("unavailable");
    expect(resolveTurnstileConfig({ TURNSTILE_SITE_KEY: realSite }).status).toBe("unavailable");
    expect(
      resolveTurnstileConfig({
        TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
        TURNSTILE_SECRET_KEY: realSecret,
      }).status,
    ).toBe("unavailable");
    expect(
      resolveTurnstileConfig({
        TURNSTILE_SITE_KEY: realSite,
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      }).status,
    ).toBe("unavailable");
    expect(
      resolveTurnstileConfig({ TURNSTILE_SITE_KEY: realSite, TURNSTILE_SECRET_KEY: realSecret }),
    ).toEqual({ status: "ok", siteKey: realSite, secret: realSecret });
  });

  test("local development falls back to test keys", () => {
    const cfg = resolveTurnstileConfig({ NEXTJS_ENV: "development" });
    expect(cfg.status).toBe("test");
  });
});

describe("public sign-up is closed", () => {
  test("every sign-up path is blocked before Better Auth", () => {
    for (const p of [
      "/api/auth/sign-up/email",
      "/api/auth/sign-up",
      "/api/auth/SIGN-UP/email",
      "/api/auth/signup",
      "/api/auth/register",
    ])
      expect(isBlockedAuthPath(p)).toBe(true);
    for (const p of [
      "/api/auth/sign-in/email",
      "/api/auth/sign-out",
      "/api/auth/get-session",
      "/api/auth/ok",
    ])
      expect(isBlockedAuthPath(p)).toBe(false);
  });

  test("Better Auth config keeps disableSignUp and D1 rate limiting", () => {
    const src = readFileSync("src/lib/auth/index.ts", "utf8");
    expect(src).toMatch(/disableSignUp:\s*true/);
    expect(src).toMatch(/storage:\s*"database"/);
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/sameSite:\s*"lax"/);
  });

  test("accounts are only created by an accepted invitation or the admin script", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f)) files.push(p);
      }
    };
    walk("src");
    walk("scripts");
    const creators = files.filter((f) => {
      const s = readFileSync(f, "utf8");
      return /insert\(user\)|INSERT INTO "user"|insert\("user"|signUpEmail|createUser\(/.test(s);
    });
    expect(creators.sort()).toEqual(
      ["scripts/lib/admin-account.ts", "src/app/admin/token-actions.ts"].sort(),
    );
  });
});

describe("admin login limiter", () => {
  const now = 1_800_000_000_000;
  test("blocks after the max failures inside the window, then expires", () => {
    expect(isBlocked(undefined, LOGIN_MAX_PER_EMAIL, now)).toBe(false);
    expect(
      isBlocked({ count: LOGIN_MAX_PER_EMAIL - 1, lastRequest: now }, LOGIN_MAX_PER_EMAIL, now),
    ).toBe(false);
    expect(
      isBlocked({ count: LOGIN_MAX_PER_EMAIL, lastRequest: now }, LOGIN_MAX_PER_EMAIL, now),
    ).toBe(true);
    expect(
      isBlocked({ count: 99, lastRequest: now - LOGIN_WINDOW_MS }, LOGIN_MAX_PER_EMAIL, now),
    ).toBe(false);
  });
});

describe("every admin Server Action checks permissions first", () => {
  const actionFiles = () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "actions.ts") files.push(p);
      }
    };
    walk("src/app/admin");
    return files;
  };
  const exportedActions = (src: string) =>
    [...src.matchAll(/export async function (\w+)\([^]*?\n}\n/g)].map(([body, name]) => ({
      body: body!,
      name: name!,
    }));

  test("panel actions call requirePermission; profile actions call requireSession", () => {
    const missing: string[] = [];
    const files = actionFiles();
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!src.startsWith('"use server"')) continue;
      if (f === "src/app/admin/actions.ts") continue; // login / second factor / logout
      const guard = f.includes("/profile/") ? /requireSession\(/ : /requirePermission\(/;
      for (const { body, name } of exportedActions(src)) {
        if (!guard.test(body)) missing.push(`${f}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
    expect(files.length).toBeGreaterThan(8);
  });

  test("every panel page checks the session on the server", () => {
    const pages: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "page.tsx" || f === "route.ts") pages.push(p);
      }
    };
    walk("src/app/admin/(panel)");
    const unguarded = pages.filter(
      (p) => !/requireUser\(|getCurrentUser\(/.test(readFileSync(p, "utf8")),
    );
    expect(unguarded).toEqual([]);
  });

  test("one-time link actions are rate-limited and consume the token atomically", () => {
    const src = readFileSync("src/app/admin/token-actions.ts", "utf8");
    for (const { body, name } of exportedActions(src)) {
      expect(`${name}: ${/tooManyAttempts\(/.test(body)}`).toBe(`${name}: true`);
      expect(`${name}: ${/consumeAuthToken\(/.test(body)}`).toBe(`${name}: true`);
    }
  });
});
