import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E, ensureUser, findUser } from "./support";

test.describe.configure({ mode: "serial" });

async function signInAs(page: Page, email: string) {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
}

test("«Миний мэдээлэл»: change name and class → Clerk and Админ → Хэрэглэгчид show it", async ({
  browser,
}) => {
  // The applicant account exists after clerk-roles.e2e.ts; create it when run on its own.
  if (!(await findUser(E2E.applicant))) await ensureUser(E2E.applicant, null);

  const me = await browser.newPage();
  await setupClerkTestingToken({ page: me });
  await signInAs(me, E2E.applicant);
  await me.goto("/me/profile");
  await me.getByLabel("Овог", { exact: true }).fill("  Тестийн ");
  await me.getByLabel("Нэр", { exact: true }).fill("Сараа");
  // The open e2e enrollment has a class list (10А, 10Б): a select, like the join form.
  await me.getByLabel("Анги", { exact: true }).selectOption("10Б");
  await expect(me.getByText("Имэйлээ солих бол админд хандаарай.")).toBeVisible();
  await me.getByRole("button", { name: "Хадгалах" }).click();
  await expect(me.getByText("Хадгаллаа")).toBeVisible();

  // Wrong characters are refused with a plain message, and nothing is lost.
  await me.getByLabel("Нэр", { exact: true }).fill("Сараа<3");
  await me.getByRole("button", { name: "Хадгалах" }).click();
  await expect(me.getByText("Зөвхөн кирилл, латин үсэг")).toBeVisible();
  await expect(me.getByLabel("Нэр", { exact: true })).toHaveValue("Сараа<3");

  await me.reload();
  await expect(me.getByLabel("Овог", { exact: true })).toHaveValue("Тестийн");
  await expect(me.getByLabel("Нэр", { exact: true })).toHaveValue("Сараа");
  await me.close();

  const account = await findUser(E2E.applicant);
  expect(account?.firstName).toBe("Сараа");
  expect(account?.lastName).toBe("Тестийн");

  const admin = await browser.newPage();
  await setupClerkTestingToken({ page: admin });
  await signInAs(admin, E2E.admin);
  await admin.goto("/admin/users");
  await admin.getByLabel("Хайх (нэр, и-мэйл)").fill("Сараа");
  const row = admin.locator("li", { hasText: "Тестийн Сараа" });
  await expect(row).toBeVisible();
  await expect(row.getByText("10Б", { exact: true })).toBeVisible();
  await expect(admin.getByText("1 хэрэглэгч олдлоо")).toBeVisible();
  await admin.close();
});
