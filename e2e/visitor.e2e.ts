import { expect, test, type Page } from "@playwright/test";

/**
 * Signed-out visitor flows. The first two are the 2026-11-28 outage: «Нэвтрэх» was a
 * client-side navigation, /sign-in kept the public page's CSP, clerk-js was blocked and the
 * sign-in card never appeared. Every way into an account area must show the Clerk card.
 */
const CLERK_FORM = 'input[name="identifier"], .cl-socialButtonsBlockButton__google';

async function expectClerkForm(page: Page) {
  await expect(page.locator(CLERK_FORM).first()).toBeVisible({ timeout: 10_000 });
}

function failOnCsp(page: Page) {
  const csp: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) csp.push(m.text());
  });
  return csp;
}

for (const [home, signIn] of [
  ["/", "/sign-in"],
  ["/en", "/en/sign-in"],
] as const)
  test(`header «sign in» on ${home} opens the Clerk card (no CSP block)`, async ({ page }) => {
    const csp = failOnCsp(page);
    await page.goto(home);
    await page.locator('header a[href$="/sign-in"]:visible').first().click();
    await page.waitForURL(`**${signIn}`);
    await expectClerkForm(page);
    expect(csp).toEqual([]);
  });

test("«Гишүүн болох» → /join (open round) → «Нэвтэрч өргөдөл гаргах» → Clerk card", async ({
  page,
}) => {
  const csp = failOnCsp(page);
  await page.goto("/");
  await page.locator('header a[href="/join"]:visible').first().click();
  await page.waitForURL("**/join");
  await page.getByRole("link", { name: "Нэвтэрч өргөдөл гаргах" }).click();
  await page.waitForURL(/\/sign-in/);
  await expectClerkForm(page);
  expect(csp).toEqual([]);
});

test("language switch stays on the same page, both ways", async ({ page }) => {
  await page.goto("/news");
  await page
    .getByRole("button", { name: /English хэл рүү шилжих|EN/ })
    .first()
    .click();
  await page.waitForURL("**/en/news");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page
    .getByRole("button", { name: /Switch to Монгол|МН/ })
    .first()
    .click();
  await page.waitForURL((u) => u.pathname === "/news");
  await expect(page.locator("html")).toHaveAttribute("lang", "mn");
});

test("theme switch: dark mode is applied and kept after a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");
  const toggle = page.locator("header button[aria-label^='Өнгөний горим']").first();
  for (let i = 0; i < 3 && !(await page.locator("html.dark").count()); i++) await toggle.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("search finds published news; filters and the 404 work", async ({ page, request }) => {
  await page.goto("/search?q=UNICEF");
  await expect(page.locator('main a[href^="/news/"]').first()).toBeVisible();
  const none = await request.get("/no-such-page-e2e");
  expect(none.status()).toBe(404);
  expect(await none.text()).toContain("404");
  expect((await request.get("/news/no-such-article-e2e")).status()).toBe(404);
  expect((await request.get("/en/events/no-such-event-e2e")).status()).toBe(404);
  await page.goto("/news?category=charity");
  await expect(page.locator("main")).toBeVisible();
});

test("old addresses redirect permanently to the new slug", async ({ request }) => {
  for (const [from, to] of [
    ["/news/volyeibolyn-temtseen-2026", "/news/voleibolyn-temtseen-2026"],
    ["/events/volyeibolyn-temtseen-2026", "/events/voleibolyn-temtseen-2026"],
    ["/gallery/mod-tarikh-ajillagaa-2026", "/gallery/mod-tarikh-ajillagaa"],
  ] as const) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect({ from, status: res.status() }).toEqual({ from, status: 308 });
    expect(new URL(res.headers().location!, "http://x").pathname).toBe(to);
  }
});

test("gallery lightbox opens, moves and closes with Escape", async ({ page }) => {
  await page.goto("/gallery/mod-tarikh-ajillagaa");
  await page
    .getByRole("button", { name: /Зургийг томоор харах/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("footer contact: mailto link, copy button, Instagram", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const footer = page.locator("footer");
  const mail = footer.locator('a[href^="mailto:"]').first();
  await expect(mail).toBeVisible();
  const address = (await mail.getAttribute("href"))!.slice("mailto:".length);
  await footer.getByRole("button", { name: "И-мэйл хаягийг хуулах" }).click();
  await expect(footer.getByRole("status")).toContainText("Хуулагдлаа");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);
  await expect(footer.locator('a[href*="instagram.com"]').first()).toBeVisible();
});

test("event calendar: the iCalendar download works (mn + en), unknown events 404", async ({
  request,
}) => {
  for (const lang of ["mn", "en"]) {
    const ics = await request.get(`/api/events/voleibolyn-temtseen-2026/ics?lang=${lang}`);
    expect(ics.status()).toBe(200);
    expect(ics.headers()["content-type"]).toContain("text/calendar");
    expect(await ics.text()).toContain("BEGIN:VEVENT");
  }
  expect((await request.get("/api/events/no-such-event/ics")).status()).toBe(404);
});
