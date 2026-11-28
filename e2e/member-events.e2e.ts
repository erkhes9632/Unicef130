import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { E2E, ensureUser, localQuery, localSql } from "./support";

test.describe.configure({ mode: "serial" });

/**
 * Member area (LOCAL D1): event sign-up and cancel on /me, one row per member and event,
 * a closed sign-up (deadline passed) offers no button. Capacity/waitlist rules are unit-tested
 * (tests/actions.test.ts, tests/members.test.ts).
 */
const OPEN_ID = "e2e-event-open";
const CLOSED_ID = "e2e-event-closed";

test.beforeAll(async () => {
  await ensureUser(E2E.applicant, "member");
  const now = Date.now();
  const day = 86_400_000;
  const row = (id: string, title: string, deadline: number) =>
    `INSERT INTO events (id, slug, title, summary, content, location, starts_at, all_day, published, signup_enabled, signup_capacity, signup_deadline, partners, beneficiaries, sdgs, admin_note, created_at, updated_at) VALUES ('${id}', '${id}', '${title}', 'E2E', '{"type":"doc","content":[]}', 'Сургууль', ${now + 7 * day}, 0, 1, 1, 5, ${deadline}, '[]', '[]', '[]', '', ${now}, ${now})`;
  localSql(
    [
      `DELETE FROM event_signups WHERE event_id IN ('${OPEN_ID}', '${CLOSED_ID}')`,
      `DELETE FROM events WHERE id IN ('${OPEN_ID}', '${CLOSED_ID}')`,
      row(OPEN_ID, "E2E нээлттэй арга хэмжээ", now + 3 * day),
      row(CLOSED_ID, "E2E хаагдсан бүртгэл", now - 60_000),
    ].join("; "),
  );
});

test.afterAll(() => {
  localSql(
    `DELETE FROM event_signups WHERE event_id IN ('${OPEN_ID}', '${CLOSED_ID}'); DELETE FROM events WHERE id IN ('${OPEN_ID}', '${CLOSED_ID}')`,
  );
});

test("member: sign up for an event on /me, then cancel; closed sign-up has no button", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: E2E.applicant });
  await page.goto("/me");

  const open = page.locator("li", { hasText: "E2E нээлттэй арга хэмжээ" });
  await open.getByRole("button", { name: "Бүртгүүлэх" }).dblclick();
  await expect(open.getByText("Та бүртгүүлсэн")).toBeVisible();
  const rows = () =>
    localQuery<{ status: string }>(
      `SELECT status FROM event_signups WHERE event_id = '${OPEN_ID}' AND status <> 'cancelled'`,
    );
  expect(rows()).toHaveLength(1);

  await open.getByRole("button", { name: "Бүртгэлээ цуцлах" }).click();
  await expect(open.getByRole("button", { name: "Бүртгүүлэх" })).toBeVisible();
  expect(rows()).toHaveLength(0);

  const closed = page.locator("li", { hasText: "E2E хаагдсан бүртгэл" });
  await expect(closed.getByRole("button", { name: "Бүртгүүлэх" })).toHaveCount(0);
});
