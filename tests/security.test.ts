import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

test("the contact form and Turnstile are gone (contact = e-mail + Instagram)", () => {
  for (const f of [
    "src/lib/integrations/turnstile.ts",
    "src/components/forms/contact-form.tsx",
    "src/app/[locale]/contact/page.tsx",
    "src/app/admin/(panel)/messages/page.tsx",
  ])
    expect([f, existsSync(f)]).toEqual([f, false]);
  expect(readFileSync("wrangler.jsonc", "utf8")).not.toContain("TURNSTILE");
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
    for (const f of [
      "src/lib/recruitment/admin-ops.ts",
      "src/lib/users/delete.ts",
      "src/lib/members/years.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src.startsWith('"use server"')).toBe(false);
      expect(src).toContain('import "server-only"');
    }
  });

  test("the proxy requires a session for /admin and /me (roles are checked by the pages)", () => {
    const src = readFileSync("src/proxy.ts", "utf8");
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
    expect(readFileSync("src/app/[locale]/layout.tsx", "utf8")).not.toContain("ClerkProvider");
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

  test("the cached public header reads only a display hint; access is decided on the server", () => {
    const header = readFileSync("src/components/layout/site-header.tsx", "utf8");
    expect(header).toContain("<HeaderAccount");
    expect(header).not.toContain("AccountMenu");
    // No Clerk and no request data in the cached header.
    for (const f of [
      "src/components/auth/header-account.tsx",
      "src/components/auth/header-account-client.tsx",
      "src/components/auth/header-cta.tsx",
      "src/components/auth/use-header-session.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toContain("@clerk/");
      expect(src).not.toMatch(/\b(headers|cookies)\(\)/);
    }
    // The hint is written from D1 (getCurrentUser / getFreshUser), never from the token claim.
    for (const f of ["src/app/auth/role-hint/route.ts", "src/app/auth/continue/route.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src).toMatch(/get(Current|Fresh)User/);
      expect(src).not.toContain("sessionClaims");
    }
    const hint = readFileSync("src/lib/auth/role-hint.ts", "utf8");
    expect(hint).toContain("Never used for access decisions");
  });

  test("the proxy only checks sign-in; roles are decided on the server", () => {
    const mw = readFileSync("src/proxy.ts", "utf8");
    expect(mw).not.toContain("sessionClaims");
    const panel = readFileSync("src/app/admin/(panel)/layout.tsx", "utf8");
    expect(panel).toContain("getAdminAccess");
    expect(panel).toContain("<AdminForbidden");
  });
});
