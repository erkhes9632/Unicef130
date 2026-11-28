import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, localQuery } from "./support";

test.describe.configure({ mode: "serial" });

/**
 * Admin panel (LOCAL D1): every sidebar page opens without errors, the dashboard figures are
 * the official yearly totals (impact_stats "total" row: joined / active / hours), «Хийх
 * зүйлс» links work, the statistics CSV downloads, Web Analytics shows "not connected".
 */
async function signInAsAdmin(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: E2E.admin });
}

test("dashboard: official totals, working «Хийх зүйлс» links, CSV, analytics not connected", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin");
  const total = localQuery<{
    members_joined: number;
    members_active: number;
    volunteer_hours: number;
  }>(
    "SELECT members_joined, members_active, volunteer_hours FROM impact_stats WHERE direction = 'total' ORDER BY school_year DESC LIMIT 1",
  )[0];
  const main = page.locator("main");
  if (total)
    for (const n of [total.members_joined, total.members_active, total.volunteer_hours])
      await expect(
        main.getByText(new RegExp(`\\b${n.toLocaleString("en-US")}\\b`)).first(),
      ).toBeVisible();
  await expect(main.getByText(/Зочдын статистик холбогдоогүй/)).toBeVisible();

  const todoLinks = await page
    .locator('section[aria-labelledby="todo-title"] a')
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  for (const href of todoLinks) {
    const res = await page.goto(href);
    expect({ href, status: res?.status() }).toEqual({ href, status: 200 });
    await expect(page.locator("h1").first()).toBeVisible();
  }

  const csv = await page.request.get("/api/admin/stats?format=csv&period=year");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
});

test("every admin sidebar page opens: 200, a heading, no console errors", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAsAdmin(page);
  await page.goto("/admin");
  const hrefs = await page
    .locator('nav a[href^="/admin"]')
    .evaluateAll((as) => [
      ...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!)),
    ]);
  expect(hrefs.length).toBeGreaterThan(8);
  const problems: string[] = [];
  for (const href of hrefs) {
    const errors: string[] = [];
    const onConsole = (m: { type(): string; text(): string }) => {
      // The school logo lives in production R2 only (not in the local copy).
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
    };
    page.on("console", onConsole);
    const res = await page.goto(href);
    await page.waitForLoadState("networkidle");
    page.off("console", onConsole);
    if (res?.status() !== 200) problems.push(`${href}: ${res?.status()}`);
    if (!(await page.locator("h1").count())) problems.push(`${href}: no h1`);
    if (errors.length) problems.push(`${href}: ${errors[0]!.slice(0, 160)}`);
  }
  expect(problems).toEqual([]);
});

test("hours and applications CSV exports download for admins", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin");
  for (const path of ["/admin/hours/export?year=2025-2026", "/admin/applications/export"]) {
    const res = await page.request.get(path);
    expect({ path, status: res.status() }).toEqual({ path, status: 200 });
    expect(res.headers()["content-type"]).toContain("text/csv");
  }
});
