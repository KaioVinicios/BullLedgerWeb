import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 8 — arrive with nothing.
 *
 * What it proves beyond "the screen renders": the first-run surface names the
 * *next action* rather than only reporting an absence, and it knows which step
 * the user is actually on. A static list of four links would pass a weaker
 * version of this test and still offer a form that cannot be submitted.
 */
test("guides a brand-new user into the first step", async ({ page }) => {
  await createSignedInAccount(page, freshUser());

  await page.goto(PATHS.APP);

  await expect(
    page.getByRole("heading", { name: app.overview.firstRun.title }),
  ).toBeVisible();

  // The next action, named and reachable — not "you have no data".
  await expect(
    page.getByRole("link", { name: app.overview.firstRun.institution.action }),
  ).toHaveAttribute("href", PATHS.INSTITUTIONS_NEW);

  // Exactly one call to action: step four is not offered before step one.
  await expect(
    page.getByRole("link", { name: app.overview.firstRun.movement.action }),
  ).toHaveCount(0);
});

test("moves the action along as the user completes each step", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  // An account with no movements. Verified live: the overview *does* return
  // this account, with `holdings: []` and zero cash — which is why the empty
  // check reads the groups rather than the array's length.
  await seedAccount(page, { name: "Corretora" });

  await page.goto(PATHS.APP);

  await expect(
    page.getByRole("heading", { name: app.overview.firstRun.title }),
  ).toBeVisible();

  // Institution still open, so it keeps the action; the account step is done
  // and says so in a word, not only with an icon.
  await expect(
    page.getByRole("link", { name: app.overview.firstRun.institution.action }),
  ).toBeVisible();
  await expect(
    page.getByText(app.overview.firstRun.account.done),
  ).toBeVisible();
});
