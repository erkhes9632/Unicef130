import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E, ensureUser } from "./support";

/**
 * Full sweep (opt-in: `E2E_SWEEP=1 bun run test:e2e -- e2e/sweep.e2e.ts`): every public page
 * (mn + en) as a visitor, a member and an admin, the member area and the admin panel, on a
 * phone and a desktop, light and dark. Fails on HTTP ≥ 400, page errors, console errors,
 * hydration warnings, horizontal overflow or layout shift > 0.1.
 */
test.skip(!process.env.E2E_SWEEP, "opt-in sweep (E2E_SWEEP=1)");
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  if (process.env.E2E_SWEEP) await ensureUser(E2E.applicant, "member", "E2E");
});

const SECTIONS = [
  "",
  "/about",
  "/impact",
  "/news",
  "/events",
  "/gallery",
  "/members",
  "/faq",
  "/support",
  "/privacy",
  "/join",
  "/search?q=UNICEF",
];
const DETAILS = [
  "/news/voleibolyn-temtseen-2026",
  "/events/voleibolyn-temtseen-2026",
  "/gallery/mod-tarikh-ajillagaa",
  "/impact/2025-2026",
  "/members/2025-2026",
];
const PUBLIC = [...SECTIONS, ...DETAILS].flatMap((p) => [p || "/", `/en${p}`]);
const MEMBER = ["/me", "/me/profile", "/me/certificate", "/en/me"];
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 900, isMobile: false, hasTouch: false },
] as const;
const THEMES = ["light", "dark"] as const;
/** Known and harmless: the school logo is in production R2 only; Clerk dev-instance notices. */
const IGNORE =
  /Failed to load resource|Clerk has been loaded with development keys|clerk\.accounts\.dev/;

async function check(page: Page, path: string): Promise<string[]> {
  const issues: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    const text = m.text();
    if ((m.type() === "error" || /hydrat/i.test(text)) && !IGNORE.test(text))
      issues.push(`console: ${text.slice(0, 160)}`);
  };
  const onError = (e: Error) => issues.push(`pageerror: ${String(e).slice(0, 160)}`);
  page.on("console", onConsole);
  page.on("pageerror", onError);
  try {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          hadRecentInput: boolean;
          value: number;
        }[])
          if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const res = await page.goto(path, { waitUntil: "load" });
    if (!res || res.status() >= 400) issues.push(`status ${res?.status()}`);
    await page.waitForTimeout(600);
    const { cls, overflow } = await page.evaluate(() => ({
      cls: (window as unknown as { __cls: number }).__cls,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    if (cls > 0.1) issues.push(`CLS ${cls.toFixed(3)}`);
    if (overflow) issues.push("horizontal overflow");
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onError);
  }
  return issues;
}

async function sweep(browser: Browser, who: string, email: string | null, paths: string[]) {
  const problems: string[] = [];
  for (const vp of VIEWPORTS)
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        colorScheme: theme,
        locale: "mn-MN",
      });
      const page = await context.newPage();
      if (email) {
        await setupClerkTestingToken({ page });
        await page.goto("/sign-in");
        await clerk.signIn({ page, emailAddress: email });
      }
      for (const path of paths)
        for (const issue of await check(page, path))
          problems.push(`${who} ${vp.name} ${theme} ${path}: ${issue}`);
      await context.close();
    }
  return problems;
}

test("visitor: every public page", async ({ browser }) => {
  test.setTimeout(900_000);
  expect(await sweep(browser, "visitor", null, PUBLIC)).toEqual([]);
});

test("member: public pages + member area", async ({ browser }) => {
  test.setTimeout(900_000);
  expect(await sweep(browser, "member", E2E.applicant, [...PUBLIC, ...MEMBER])).toEqual([]);
});

test("admin: public pages + every admin page", async ({ browser }) => {
  test.setTimeout(1_200_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: E2E.admin });
  await page.goto("/admin");
  const admin = await page
    .locator('nav a[href^="/admin"]')
    .evaluateAll((as) => [
      ...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!)),
    ]);
  await ctx.close();
  expect(await sweep(browser, "admin", E2E.admin, [...PUBLIC, ...admin])).toEqual([]);
});
