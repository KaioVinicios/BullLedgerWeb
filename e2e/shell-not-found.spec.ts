import app from "@/i18n/locales/en/app.json" with { type: "json" };
import common from "@/i18n/locales/en/common.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createSignedInAccount, freshUser } from "./support/users";

/** `v1-e2e-todo.md` Phase 3 — a wrong address inside the app. */

test("keeps the shell around an unknown authenticated route", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  await page.goto(`${PATHS.APP}/nowhere`);

  await expect(page.getByText(app.notFound.title)).toBeVisible();

  // The app's own not-found, not the public one. Both share a title, so the
  // recovery link is what tells them apart: "Back to overview" here, "Back
  // home" on the public surface.
  await expect(
    page.getByRole("link", { name: app.notFound.action }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: common.notFound.backHome }),
  ).toHaveCount(0);

  // Not a blank page, and specifically not a logout.
  await expect(
    page.getByRole("navigation", { name: app.sidebar.label }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(`${PATHS.LOGIN}$`));

  await page.getByRole("link", { name: app.notFound.action }).click();
  await expect(page).toHaveURL(PATHS.APP);
});
