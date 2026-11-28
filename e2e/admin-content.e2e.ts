import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, localSql } from "./support";

test.describe.configure({ mode: "serial" });

/**
 * Admin content lifecycle on the LOCAL preview: create → publish → the cached public page shows
 * it (background re-render) → slug change keeps the old address working (308) → back to draft
 * hides it (404) → delete. Uses its own news post; leaves nothing behind.
 */
const STAMP = Date.now().toString(36);
const TITLE = `E2E контент ${STAMP}`;
const SLUG = `e2e-content-${STAMP}`;
const SLUG2 = `e2e-content-${STAMP}-v2`;

test.afterAll(() => {
  localSql(
    `DELETE FROM slug_redirects WHERE from_slug LIKE 'e2e-content-%'; DELETE FROM news WHERE slug LIKE 'e2e-content-%'`,
  );
});

async function signInAsAdmin(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: E2E.admin });
}

/** Cached public page: retry until the background re-render shows the change. */
async function eventually(check: () => Promise<void>) {
  await expect(check).toPass({ timeout: 100_000, intervals: [1_000, 2_000, 3_000] });
}

async function saveForm(page: Page) {
  await page.getByRole("button", { name: "Хадгалах" }).first().click();
  await page.waitForURL(/\/admin\/news\/[^/]+\?saved=1/);
}

test("news: create, publish, public page updates, slug change → 308, draft → 404, delete", async ({
  page,
  request,
}) => {
  test.setTimeout(400_000);
  await signInAsAdmin(page);

  // Create + publish.
  await page.goto("/admin/news/new");
  await page.locator("#title").fill(TITLE);
  await page.locator("#slug").fill(SLUG);
  await page.locator("#excerpt").fill("E2E туршилтын мэдээ.");
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type("E2E агуулга.");
  await page.locator("#status").selectOption("published");
  await saveForm(page);
  const editUrl = page.url().split("?")[0]!;

  await eventually(async () => {
    const res = await request.get(`/news/${SLUG}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain(TITLE);
  });
  await eventually(async () => {
    expect(await (await request.get("/news")).text()).toContain(TITLE);
  });

  // Slug change: the old address answers 308 to the new one.
  await page.goto(editUrl);
  // Published → the address is locked until «Хаяг өөрчлөх».
  await expect(page.locator("#slug")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Хаяг өөрчлөх" }).click();
  await page.locator("#slug").fill(SLUG2);
  await saveForm(page);
  const t0 = Date.now();
  await eventually(async () => {
    const old = await request.get(`/news/${SLUG}`, { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(new URL(old.headers().location!, "http://x").pathname).toBe(`/news/${SLUG2}`);
  });
  console.log(`old slug → 308 after ${Date.now() - t0} ms`);
  await eventually(async () => {
    expect((await request.get(`/news/${SLUG2}`)).status()).toBe(200);
  });

  // Back to draft: hidden from the public site.
  await page.goto(editUrl);
  await page.locator("#status").selectOption("draft");
  await saveForm(page);
  await eventually(async () => {
    expect((await request.get(`/news/${SLUG2}`)).status()).toBe(404);
  });
  await eventually(async () => {
    expect(await (await request.get("/news")).text()).not.toContain(TITLE);
  });

  // Delete from the list.
  await page.goto(`/admin/news?q=${encodeURIComponent(STAMP)}`);
  const row = page.locator("li", { hasText: TITLE });
  await row.getByRole("button", { name: "Устгах" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Устгах" }).click();
  await expect(page.locator("li", { hasText: TITLE })).toHaveCount(0);
});
