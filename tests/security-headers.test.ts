import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { buildCsp, generateNonce, staticSecurityHeaders } from "@/lib/security-headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values];
    }),
  );

describe("Content-Security-Policy", () => {
  const prod = directives(buildCsp({ nonce: "abc123", dev: false, https: true }));

  test("scripts need the per-request nonce; no inline or eval in production", () => {
    expect(prod["script-src"]).toContain("'nonce-abc123'");
    expect(prod["script-src"]).toContain("'strict-dynamic'");
    expect(prod["script-src"]).not.toContain("'unsafe-inline'");
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
  });

  test("only Turnstile and Google Maps are allowed as third parties", () => {
    expect(prod["script-src"]).toContain("https://challenges.cloudflare.com");
    expect(prod["frame-src"]).toEqual([
      "https://challenges.cloudflare.com",
      "https://www.google.com",
    ]);
    expect(prod["default-src"]).toEqual(["'self'"]);
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
  });

  test("the site cannot be framed and upgrades insecure requests on https", () => {
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect("upgrade-insecure-requests" in prod).toBe(true);
    const http = directives(buildCsp({ nonce: "n", dev: false, https: false }));
    expect("upgrade-insecure-requests" in http).toBe(false);
  });

  test("Clerk: its Frontend API (from the key) and bot-protection hosts only when configured", () => {
    const clerk = directives(
      buildCsp({
        nonce: "n",
        dev: false,
        https: true,
        clerkFrontendApi: "https://clerk.example.mn",
      }),
    );
    expect(clerk["script-src"]).toContain("https://clerk.example.mn");
    expect(clerk["connect-src"]).toContain("https://clerk.example.mn");
    expect(clerk["connect-src"]).toContain("https://*.protect.clerk.com:*");
    expect(clerk["frame-src"]).toContain("https://*.protect.clerk.com");
    expect(clerk["worker-src"]).toEqual(["'self'", "blob:"]);
    expect(clerk["script-src"]).not.toContain("'unsafe-inline'");
    expect(prod["connect-src"]).toEqual(["'self'", "https://challenges.cloudflare.com"]);
  });

  test("development adds only what the dev server needs", () => {
    const dev = directives(buildCsp({ nonce: "n", dev: true, https: false }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
  });

  test("nonces are random and header-safe", () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(generateNonce()).not.toBe(a);
  });
});

describe("static security headers", () => {
  test("HSTS only over https; the rest always", () => {
    const https = staticSecurityHeaders({ https: true });
    expect(https["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(https["X-Frame-Options"]).toBe("DENY");
    expect(https["X-Content-Type-Options"]).toBe("nosniff");
    expect(https["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(https["Permissions-Policy"]).toContain("camera=()");
    expect("Strict-Transport-Security" in staticSecurityHeaders({ https: false })).toBe(false);
  });

  test("the middleware covers pages, admin and API; assets use public/_headers", () => {
    const mw = readFileSync("src/middleware.ts", "utf8");
    expect(mw).toContain('response.headers.set("Content-Security-Policy", csp)');
    expect(mw).toContain('matcher: ["/((?!_next/static|_next/image).*)"]');
    const assets = readFileSync("public/_headers", "utf8");
    expect(assets).toContain("X-Content-Type-Options: nosniff");
  });

  test("browser-side schemas never probe for eval (zod JIT off)", () => {
    for (const f of ["src/lib/validation/forms.ts", "src/lib/settings/types.ts"]) {
      expect(readFileSync(f, "utf8").split("\n")[0]).toContain("zod-config");
    }
  });
});
