import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, findUser } from "./support";

test.describe.configure({ mode: "serial" });

async function signInAs(page: Page, email: string) {
  await page.goto("/");
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

test("non-admins are kept out of /admin; applicants out of /me", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await signInAs(page, E2E.applicant);
  await page.goto("/admin");
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/join$/);
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
  await expect(page).toHaveURL(/localhost:\d+\/$/);
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
