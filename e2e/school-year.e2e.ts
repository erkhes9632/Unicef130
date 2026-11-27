import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, localSql } from "./support";

test.describe.configure({ mode: "serial" });

/**
 * «Шинэ хичээлийн жил эхлүүлэх» end to end (LOCAL D1 only): the wizard creates 2026-2027 with
 * the chosen leaders → /members shows "2026–2027 оны удирдлага" with 2025–2026 under «Өмнөх
 * жилүүд» → the news list is grouped by school year, newest first.
 */
const NEW_LEADER = "E2E Удирдагч";
const NEW_POSITION = "E2E Ерөнхийлөгч";

test.beforeAll(() => {
  const now = Date.now();
  // Back to the state right after migration 0012: only 2025-2026 has a team, no year setting.
  localSql(
    [
      "DELETE FROM member_years WHERE school_year <> '2025-2026'",
      "DELETE FROM members WHERE name LIKE 'E2E %'",
      "DELETE FROM settings WHERE key = 'schoolYear'",
      // One post of the current school year, so the news list has two year groups.
      "DELETE FROM news WHERE id = 'e2e-news-2026'",
      `INSERT INTO news (id, slug, title, excerpt, content, category, tags, status, published_at, sdgs, created_at, updated_at) VALUES ('e2e-news-2026', 'e2e-medee-2026', 'E2E мэдээ 2026', 'Туршилт', '{"type":"doc","content":[]}', 'activity', '[]', 'published', ${now - 60_000}, '[]', ${now}, ${now})`,
    ].join("; "),
  );
});

async function signInAsAdmin(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: E2E.admin });
}

/** Cached public page: reload until the background re-render shows the change. */
async function eventually(page: Page, path: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(path);
    await check();
  }).toPass({ timeout: 100_000, intervals: [1_000, 2_000, 3_000] });
}

test("wizard: new year with chosen leaders; the old year stays as history", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/school-year");
  await expect(page.getByTestId("wizard-years")).toHaveText(
    "Одоогийн жил: 2025–2026 → Шинэ жил: 2026–2027",
  );
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();

  // Step 2: keep two of the current leaders, add a new person.
  const keep = page.locator('button[role="checkbox"][id^="keep-"]');
  await expect(keep).toHaveCount(5);
  await keep.nth(0).click();
  await keep.nth(1).click();
  await page.locator("#new-name").fill(NEW_LEADER);
  await page.locator("#new-class").fill("11А");
  await page.locator("#new-position").fill(NEW_POSITION);
  await page.getByRole("button", { name: "Шинэ хүн нэмэх" }).click();
  await expect(page.getByText("Сонгосон: 3.")).toBeVisible();
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();

  // Step 3: nobody is copied by default.
  await expect(page.getByText("Хуулах: 0")).toBeVisible();
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();

  // Step 4: confirm.
  await page.getByRole("button", { name: "2026–2027 хичээлийн жилийг эхлүүлэх" }).click();
  await expect(
    page.getByRole("heading", { name: "2026–2027 хичээлийн жил эхэллээ" }),
  ).toBeVisible();
  await expect(page.getByText("Удирдлага: 3")).toBeVisible();

  // Admin → Гишүүд opens on the new (current) year; the old year is one click away.
  await page.goto("/admin/members");
  const years = page.getByRole("navigation", { name: "Хичээлийн жил" });
  await expect(years.getByRole("link", { name: /2026–2027 \(одоогийн\)/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "Удирдлага (3)" })).toBeVisible();
  await years.getByRole("link", { name: /^2025–2026/ }).click();
  await expect(page.getByText("Өмнөх жилийн мэдээлэл")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Удирдлага (5)" })).toBeVisible();
});

test("public /members: the new year on top, 2025–2026 under «Өмнөх жилүүд»", async ({ page }) => {
  await eventually(page, "/members", async () => {
    await expect(
      page.getByRole("heading", { level: 2, name: "2026–2027 оны удирдлага" }),
    ).toBeVisible({
      timeout: 2_000,
    });
  });
  // Names stay hidden (no consent): the position is shown.
  await expect(page.getByText(NEW_POSITION)).toBeVisible();
  await expect(page.getByText(NEW_LEADER)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Өмнөх жилүүд" })).toBeVisible();
  const old = page.locator("details#year-2025-2026");
  await expect(old.locator("summary")).toHaveText("2025–2026 хичээлийн жил");
  await old.locator("summary").click();
  await expect(old.getByRole("heading", { name: "2025–2026 оны удирдлага" })).toBeVisible();
});

test("news: grouped by school year, newest first", async ({ page }) => {
  // Background re-renders after "every page stale" take a while on the local Worker.
  test.setTimeout(150_000);
  // The test post was written straight to D1: a settings save marks every public page stale.
  await signInAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Хадгалах" }).first().click();
  await expect(page.getByText("Тохиргоо хадгалагдлаа.").first()).toBeVisible();

  await eventually(page, "/news", async () => {
    const headings = page.locator("#news-list h2");
    await expect(headings.first()).toHaveText("2026–2027 хичээлийн жил", { timeout: 2_000 });
  });
  const headings = await page.locator("#news-list h2").allTextContents();
  expect(headings).toEqual(["2026–2027 хичээлийн жил", "2025–2026 хичээлийн жил"]);
  await expect(page.getByRole("link", { name: "2025–2026" })).toBeVisible();
  // Year chip: only that year, kept in the address.
  await page.getByRole("link", { name: "2025–2026" }).click();
  await expect(page).toHaveURL(/\?year=2025-2026/);
  expect(await page.locator("#news-list h2").allTextContents()).toEqual([
    "2025–2026 хичээлийн жил",
  ]);
});
