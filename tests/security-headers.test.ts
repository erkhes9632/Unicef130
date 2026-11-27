import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { buildCsp, staticSecurityHeaders } from "@/lib/security-headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values];
    }),
  );

describe("Content-Security-Policy", () => {
  const prod = directives(buildCsp({ dev: false, https: true }));

  test("cached pages: no nonce; inline allowed, eval never in production", () => {
    expect(prod["script-src"]).toContain("'self'");
    expect(prod["script-src"]).toContain("'unsafe-inline'");
    expect(prod["script-src"].some((v: string) => v.startsWith("'nonce-"))).toBe(false);
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
  });

  test("public pages: only Web Analytics as a third party, no frames", () => {
    expect(prod["script-src"]).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://static.cloudflareinsights.com",
    ]);
    expect(prod["frame-src"]).toEqual(["'none'"]);
    expect(prod["connect-src"]).toEqual(["'self'", "https://cloudflareinsights.com"]);
    expect(prod["default-src"]).toEqual(["'self'"]);
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
  });

  test("the site cannot be framed and upgrades insecure requests on https", () => {
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect("upgrade-insecure-requests" in prod).toBe(true);
    const http = directives(buildCsp({ dev: false, https: false }));
    expect("upgrade-insecure-requests" in http).toBe(false);
  });

  test("Clerk (account areas): its Frontend API and bot-protection hosts only when configured", () => {
    const clerk = directives(
      buildCsp({ dev: false, https: true, clerkFrontendApi: "https://clerk.example.mn" }),
    );
    expect(clerk["script-src"]).toContain("https://clerk.example.mn");
    expect(clerk["connect-src"]).toContain("https://clerk.example.mn");
    expect(clerk["connect-src"]).toContain("https://*.protect.clerk.com:*");
    // The bot-protection loader is a script from cdn.protect.clerk.com.
    expect(clerk["script-src"]).toContain("https://*.protect.clerk.com");
    expect(clerk["frame-src"]).toContain("https://*.protect.clerk.com");
    // Clerk's sign-up bot protection runs Cloudflare's challenge (account areas only).
    expect(clerk["script-src"]).toContain("https://challenges.cloudflare.com");
    expect(clerk["frame-src"]).toContain("https://challenges.cloudflare.com");
    expect(clerk["worker-src"]).toEqual(["'self'", "blob:"]);
    expect(prod["script-src"].join(" ")).not.toContain("clerk");
  });

  test("development adds only what the dev server needs", () => {
    const dev = directives(buildCsp({ dev: true, https: false }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
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

  test("headers: proxy for account areas, next.config for cached pages, _headers for assets", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    expect(proxy).toContain('response.headers.set("Content-Security-Policy", csp)');
    // Clerk only runs in the account areas (Free plan CPU budget).
    for (const area of [
      "/admin/:path*",
      "/me/:path*",
      "/(en|mn)/me/:path*",
      "/join",
      "/(en|mn)/join",
      "/sign-in/:path*",
      "/(en|mn)/sign-in/:path*",
    ])
      expect(proxy).toContain(`"${area}"`);
    expect(proxy).not.toContain('"/:path*"');
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain("headers: publicHeaders");
    const assets = readFileSync("public/_headers", "utf8");
    expect(assets).toContain("X-Content-Type-Options: nosniff");
  });

  test("browser-side schemas never probe for eval (zod JIT off)", () => {
    for (const f of ["src/lib/validation/forms.ts", "src/lib/settings/types.ts"]) {
      expect(readFileSync(f, "utf8").split("\n")[0]).toContain("zod-config");
    }
  });
});
