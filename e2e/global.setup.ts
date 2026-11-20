import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E, deleteUser, ensureUser, localSql } from "./support";

setup("Clerk testing token, accounts and an open recruitment period", async ({ request }) => {
  // Warm the preview up (the first requests after a start are slow).
  for (const path of ["/", "/join", "/sign-in"]) await request.get(path, { timeout: 60_000 });
  // Safety: the preview must use the Clerk DEVELOPMENT instance. .dev.vars lines win over the
  // pk_live_ key in wrangler.jsonc only if they are the last ones for that name.
  const signIn = await (await request.get("/sign-in")).text();
  if (signIn.includes("pk_live_") || !signIn.includes(".clerk.accounts.dev"))
    throw new Error(
      "The preview is not on the Clerk Development instance — check .dev.vars (pk_test_/sk_test_ only).",
    );
  await clerkSetup();
  await deleteUser(E2E.applicant);
  await ensureUser(E2E.admin, "admin", "E2E");
  await ensureUser(E2E.admin2, "admin", "E2E2");
  const now = Date.now();
  localSql(
    [
      "DELETE FROM applications WHERE email LIKE 'e2e-%'",
      "DELETE FROM users WHERE email LIKE 'e2e-%'",
      "UPDATE members SET user_id = NULL WHERE email LIKE 'e2e-%'",
      // One open period without a capacity limit (closing any other open one).
      `UPDATE recruitment_periods SET closes_at = ${now - 60_000} WHERE opens_at <= ${now} AND closes_at > ${now} AND id <> 'e2e-period'`,
      "DELETE FROM recruitment_periods WHERE id = 'e2e-period'",
      `INSERT INTO recruitment_periods (id, name, school_year, opens_at, closes_at, when_full, classes, intro_text, closed_message, questions, show_banner) VALUES ('e2e-period', 'E2E элсэлт', '2026-2027', ${now - 3_600_000}, ${now + 7 * 86_400_000}, 'waitlist', '["10А","10Б"]', '', '', '[]', 1)`,
    ].join("; "),
  );
});
