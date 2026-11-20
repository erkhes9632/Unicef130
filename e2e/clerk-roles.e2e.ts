import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, findUser } from "./support";

test.describe.configure({ mode: "serial" });

/** Programmatic sign-in needs clerk-js on the page: public pages don't load it, /sign-in does. */
async function signInAs(page: Page, email: string) {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
}

test("applicant: signs up with an e-mail code, applies once, sees the status", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/join");
  await expect(page.getByText("Эхлээд нэвтэрнэ үү")).toBeVisible();
  await page.getByRole("link", { name: "Нэвтэрч өргөдөл гаргах" }).click();

  await page.locator('input[name="identifier"]').fill(E2E.applicant);
  await page.locator(".cl-formButtonPrimary").click();
  await page.locator(".cl-otpCodeFieldInput").first().waitFor();
  await page.keyboard.type("424242");
  await page.waitForURL("**/join");

  await expect(page.getByText(E2E.applicant)).toBeVisible();
  await page.locator("#join-fullName").fill("Батын Анужин");
  await page.locator("#join-className").selectOption("10А");
  await page.locator("#join-phone").fill("8811 2233");
  await page
    .locator("#join-reason")
    .fill("Хүүхдийн эрхийн талаар илүү ихийг мэдэж, бусдад туслахыг хүсэж байна.");
  await page.locator("main fieldset button[role=checkbox]").first().click();
  await page.locator("main form > div button[role=checkbox]").last().click();
  await page.getByRole("button", { name: "Илгээх" }).click();

  await expect(page.getByRole("heading", { name: "Хүлээгдэж байна" })).toBeVisible();
  await page.reload();
  await expect(page.locator("#join-fullName")).toHaveCount(0);
});

test("applicant: /admin explains there are no admin rights; /me → /join; no admin link", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.applicant);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Танд админ эрх байхгүй" })).toBeVisible();
  await expect(page.getByText(E2E.applicant)).toBeVisible();
  await expect(page.getByRole("link", { name: "Гараад дахин нэвтрэх" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Админ цэс" })).toHaveCount(0);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/join$/);
  await page.goto("/");
  await expect(page.locator('header a[href="/admin"]')).toHaveCount(0);
});

test("admin: lands on /admin after sign-in and sees the «Админ» button on public pages", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.admin);
  // The post-sign-in landing route (Clerk's fallback redirect) sends admins to the panel.
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("navigation", { name: "Админ цэс" })).toBeVisible();
  await page.goto("/about");
  const adminButton = page.locator("header").getByRole("link", { name: "Админ", exact: true });
  await expect(adminButton).toBeVisible();
  await page.getByRole("button", { name: "Бүртгэлийн цэс" }).click();
  await expect(page.getByRole("menuitem", { name: "Админ хэсэг" })).toBeVisible();
  await page.keyboard.press("Escape");
  await adminButton.click();
  await expect(page).toHaveURL(/\/admin$/);
  // Mobile: the menu sheet has the same shortcut.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  await page.getByRole("button", { name: "Цэс нээх" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Админ хэсэг" })).toBeVisible();
});

test("admin approves → the applicant becomes a member", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.admin);
  await page.goto("/admin/applications?q=Анужин");
  const row = page.locator("details").filter({ hasText: "Батын Анужин" }).first();
  await row.locator("summary").click();
  await row.getByLabel("Төлөв").selectOption("accepted");
  await expect(page.getByText(/Тэнцсэн гэж тэмдэглэлээ/)).toBeVisible();
  await expect
    .poll(async () => (await findUser(E2E.applicant))?.publicMetadata.role)
    .toBe("member");
});

test("member: /join links to /me, which shows the member area", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.applicant);
  await page.goto("/join");
  await page.getByRole("button", { name: "Миний хэсэг рүү" }).click();
  await page.waitForURL("**/me");
  await expect(page.getByRole("heading", { name: "Сайн дурын цаг" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Миний мэдээлэл" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Танд админ эрх байхгүй" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Миний хэсэг" })).toBeVisible();
  await page.goto("/auth/continue");
  await expect(page).toHaveURL(/\/me$/);
});

test("admin can't delete their own account from /me", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.admin);
  await page.goto("/me");
  await expect(page.getByText(/Админ өөрийн бүртгэлийг устгах боломжгүй/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Бүртгэлээ устгах" })).toHaveCount(0);
  await page.goto("/admin/users?q=e2e-admin%2Bclerk");
  await expect(page.getByText("Өөрийн бүртгэлийн эрхийг өөр админ өөрчилнө.")).toBeVisible();
});

test("admin bans and unbans an account from Админ → Хэрэглэгчид (Clerk follows)", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.admin);
  await page.goto("/admin/users?q=e2e-applicant%2Bclerk");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Идэвхгүй болгох" }).first().click();
  await expect.poll(async () => (await findUser(E2E.applicant))?.banned).toBe(true);
  await expect(page.getByRole("button", { name: "Идэвхжүүлэх" }).first()).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Идэвхжүүлэх" }).first().click();
  await expect.poll(async () => (await findUser(E2E.applicant))?.banned).toBe(false);
});
