import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { submitLoginForm } from "./support/forms";
import { createAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — being sent to login, and being sent back. */

test("returns to the intended destination after the login it forced", async ({
  page,
  request,
}) => {
  const user = freshUser();
  await createAccount(request, user);

  await page.goto(PATHS.APP);

  // The destination rides in the URL, so the login screen can be reloaded,
  // shared, or reached through a password reset without losing it.
  await expect(page).toHaveURL(
    `${PATHS.LOGIN}?redirect=${encodeURIComponent(PATHS.APP)}`,
  );

  await submitLoginForm(page, user);

  // Back where they were headed, not at a generic home.
  await expect(page).toHaveURL(PATHS.APP);
  await expect(
    page.getByRole("heading", { name: app.screens.overview.title }),
  ).toBeVisible();
});
