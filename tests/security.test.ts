import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
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

const walkFiles = (dir: string, keep: (name: string) => boolean) => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (keep(f)) out.push(p);
    }
  };
  walk(dir);
  return out;
};
const exportedActions = (src: string) =>
  [...src.matchAll(/export async function (\w+)\([^]*?\n}\n/g)].map(([body, name]) => ({
    body: body!,
    name: name!,
  }));

describe("every Server Action checks the role on the server", () => {
  test("admin panel actions call assertAdmin() first", () => {
    const files = walkFiles("src/app/admin", (f) => f === "actions.ts");
    const missing: string[] = [];
    for (const f of files) {
      for (const { body, name } of exportedActions(readFileSync(f, "utf8")))
        if (!/assertAdmin\(\)/.test(body)) missing.push(`${f}: ${name}`);
    }
    expect(missing).toEqual([]);
    expect(files.length).toBeGreaterThan(8);
  });

  test("member-area actions call assertMember() or assertSignedIn()", () => {
    const src = readFileSync("src/app/[locale]/me/actions.ts", "utf8");
    const actions = exportedActions(src);
    expect(actions.length).toBeGreaterThanOrEqual(4);
    for (const { body, name } of actions)
      expect(`${name}: ${/assert(Member|SignedIn)\(\)/.test(body)}`).toBe(`${name}: true`);
  });

  test("every admin page and route checks the session on the server", () => {
    const pages = walkFiles("src/app/admin/(panel)", (f) => f === "page.tsx" || f === "route.ts");
    const unguarded = pages.filter(
      (p) => !/requireAdmin\(|getCurrentUser\(/.test(readFileSync(p, "utf8")),
    );
    expect(unguarded).toEqual([]);
    expect(pages.length).toBeGreaterThan(15);
  });

  test('"use server" files export only async functions (anything else becomes an endpoint or breaks the module)', () => {
    const files = walkFiles("src", (f) => /\.tsx?$/.test(f)).filter((f) =>
      readFileSync(f, "utf8").startsWith('"use server"'),
    );
    const bad: string[] = [];
    for (const f of files) {
      for (const line of readFileSync(f, "utf8").split("\n"))
        if (/^export (?!async function |type |interface )/.test(line)) bad.push(`${f}: ${line}`);
    }
    expect(bad).toEqual([]);
    expect(files.length).toBeGreaterThan(10);
  });

  test("helpers that trust their arguments are not Server Actions", () => {
    for (const f of ["src/lib/recruitment/admin-ops.ts", "src/lib/users/delete.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src.startsWith('"use server"')).toBe(false);
      expect(src).toContain('import "server-only"');
    }
  });

  test("the middleware requires a session for /admin and /me (roles are checked by the pages)", () => {
    const src = readFileSync("src/middleware.ts", "utf8");
    expect(src).toContain("clerkMiddleware(");
    expect(src).toMatch(/decideAccess\(area/);
    expect(src).toContain("redirectToSignIn");
  });

  test("audit summaries never contain a person's name (ids only)", () => {
    // Periods are named by admins ("2026 намар"), not people: that file may use `.name`.
    const files = [
      ...walkFiles("src/app/admin", (f) => f === "actions.ts"),
      ...walkFiles("src/lib", (f) => /\.ts$/.test(f)),
    ].filter((f) => !f.endsWith("recruitment/actions.ts"));
    const bad: string[] = [];
    for (const f of files)
      for (const line of readFileSync(f, "utf8").split("\n"))
        if (/summary:.*\$\{[^}]*\b(name|fullName|email|phone)\b/.test(line))
          bad.push(`${f}: ${line.trim()}`);
    expect(bad).toEqual([]);
  });

  test("the previous password-based auth library is gone (code and package.json)", () => {
    // Built from parts so this test itself doesn't match a repository-wide search.
    const old = new RegExp(["better", "-auth|better", "Auth"].join(""), "i");
    const files = walkFiles("src", (f) => /\.(ts|tsx)$/.test(f));
    expect(files.filter((f) => old.test(readFileSync(f, "utf8")))).toEqual([]);
    expect(old.test(readFileSync("package.json", "utf8"))).toBe(false);
  });
});

describe("Clerk is loaded only in the account areas", () => {
  test("the client SDK (@clerk/nextjs) is imported only by the allowed files", () => {
    // Server-only entry points (/server, /webhooks) never reach the browser.
    const allowed = new Set([
      "src/components/auth/clerk-shell.tsx",
      "src/components/auth/account-menu.tsx", // admin header (inside ClerkShell)
      "src/components/auth/member-area-link.tsx", // /join
      "src/components/auth/sign-out-runner.tsx", // /sign-out
      "src/components/me/me-client.tsx", // /me
      "src/app/[locale]/sign-in/[[...sign-in]]/page.tsx",
    ]);
    const files = walkFiles("src", (f) => /\.(ts|tsx)$/.test(f));
    const clientImports = files.filter((f) =>
      /from "@clerk\/nextjs"/.test(readFileSync(f, "utf8")),
    );
    expect(clientImports.filter((f) => !allowed.has(f))).toEqual([]);
  });

  test("only the account-area layouts wrap their pages in ClerkShell", () => {
    expect(readFileSync("src/app/layout.tsx", "utf8")).not.toContain("ClerkProvider");
    const users = walkFiles("src/app", (f) => /\.tsx$/.test(f)).filter((f) =>
      readFileSync(f, "utf8").includes("<ClerkShell"),
    );
    expect(users.sort()).toEqual(
      [
        "src/app/[locale]/join/layout.tsx",
        "src/app/[locale]/me/layout.tsx",
        "src/app/[locale]/sign-in/layout.tsx",
        "src/app/[locale]/sign-out/layout.tsx",
        "src/app/admin/layout.tsx",
      ].sort(),
    );
  });

  test("the public header renders the account button on the server", () => {
    const header = readFileSync("src/components/layout/site-header.tsx", "utf8");
    expect(header).toContain("<HeaderAccount");
    expect(header).not.toContain("AccountMenu");
    const account = readFileSync("src/components/auth/header-account.tsx", "utf8");
    expect(account).toContain("getHeaderSession");
    expect(account).not.toContain('"use client"');
    const session = readFileSync("src/lib/auth/header-session.ts", "utf8");
    expect(session).toContain('from "@clerk/nextjs/server"');
    // The header role comes from D1 (getCurrentUser), not from the token claim alone.
    expect(session).toContain("getCurrentUser");
    expect(session).not.toContain("sessionClaims");
  });

  test("the middleware only checks sign-in; roles are decided on the server", () => {
    const mw = readFileSync("src/middleware.ts", "utf8");
    expect(mw).not.toContain("sessionClaims");
    const panel = readFileSync("src/app/admin/(panel)/layout.tsx", "utf8");
    expect(panel).toContain("getAdminAccess");
    expect(panel).toContain("<AdminForbidden");
  });
});
