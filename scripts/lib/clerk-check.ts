import { chromium, type Page } from "@playwright/test";

/**
 * Browser part of `bun run smoke` (system Chrome via Playwright, signed out): the Clerk sign-in
 * card must appear within 10 s — opened directly (/sign-in, /en/sign-in), reached by clicking
 * the header's «Нэвтрэх» on a public page (the 2026-11-28 outage: a client-side navigation kept
 * the public CSP and clerk-js was blocked), and on /join (its sign-in button while enrollment is
 * open; while it is closed clerk-js must still load there). Any CSP violation fails the check.
 * With a pinned version, only requests to the site itself carry the version-override header.
 */
const FORM = 'input[name="identifier"], .cl-socialButtonsBlockButton__google';
const TIMEOUT = 10_000;

export async function checkClerkWidgets(
  base: string,
  headers: Record<string, string> = {},
): Promise<string[]> {
  const failures: string[] = [];
  const origin = new URL(base).origin;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const visit = async (name: string, run: (page: Page) => Promise<void>) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      if (Object.keys(headers).length)
        await context.route(
          (url) => url.origin === origin,
          (route) => route.continue({ headers: { ...route.request().headers(), ...headers } }),
        );
      const page = await context.newPage();
      const csp: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && /Content Security Policy/i.test(m.text()))
          csp.push(m.text().slice(0, 200));
      });
      try {
        await run(page);
        if (csp.length) failures.push(`${name}: CSP blocked something — ${csp[0]}`);
      } catch (err) {
        const detail = csp[0] ?? String(err).split("\n")[0];
        failures.push(`${name}: ${detail}`);
      } finally {
        await context.close();
      }
    };
    const formVisible = (page: Page) =>
      page.locator(FORM).first().waitFor({ state: "visible", timeout: TIMEOUT });

    for (const path of ["/sign-in", "/en/sign-in"])
      await visit(`${path} (opened directly)`, async (page) => {
        await page.goto(base + path);
        await formVisible(page);
      });
    for (const path of ["/", "/en"])
      await visit(`${path} → header «sign in» click`, async (page) => {
        await page.goto(base + path);
        const link = page.locator(`header a[href$="/sign-in"]:visible`).first();
        await link.waitFor({ state: "visible", timeout: TIMEOUT });
        await link.click();
        await page.waitForURL(/\/sign-in/, { timeout: TIMEOUT });
        await formVisible(page);
      });
    for (const path of ["/", "/en"])
      await visit(`${path} → header «join» click`, async (page) => {
        await page.goto(base + path);
        const link = page.locator(`header a[href$="/join"]:visible`).first();
        await link.waitFor({ state: "visible", timeout: TIMEOUT });
        await link.click();
        await page.waitForURL(/\/join/, { timeout: TIMEOUT });
        await page.waitForFunction(
          () => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
          undefined,
          { timeout: TIMEOUT },
        );
      });
    for (const path of ["/join", "/en/join"])
      await visit(`${path} (signed out)`, async (page) => {
        await page.goto(base + path);
        const signIn = page.locator(`main a[href*="/sign-in"]`).first();
        if (await signIn.count()) {
          await signIn.click();
          await formVisible(page);
          return;
        }
        // Enrollment closed: no sign-in button, but Clerk must still load on the page.
        await page.waitForFunction(
          () => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
          undefined,
          { timeout: TIMEOUT },
        );
      });
  } finally {
    await browser.close();
  }
  return failures;
}
