import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against the local Workers preview (`bun run preview`, port 8787) with the
 * Clerk DEVELOPMENT instance from .dev.vars. Clerk testing tokens skip bot protection; test
 * accounts use `+clerk_test` addresses (no e-mail is sent, the code is 424242).
 * Run: `bun run preview` in one terminal, then `bun run test:e2e`.
 */
if (existsSync(".dev.vars")) {
  for (const line of readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]!] === undefined)
      process.env[m[1]!] = m[2]!.replace(/^(["'])(.*)\1$/, "$2");
  }
}
process.env.CLERK_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  // The flows share accounts and one recruitment period: run them in order.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8787",
    // System Chrome: no browser download needed.
    channel: "chrome",
    trace: "retain-on-failure",
    locale: "mn-MN",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts$/ },
    { name: "e2e", dependencies: ["setup"] },
  ],
});
