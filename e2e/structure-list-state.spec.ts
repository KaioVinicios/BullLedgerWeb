import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 5 — filter and sort a resource list, then reload.
 *
 * The URL is the state: the same view must be restored from the address
 * alone. Paging past the 50-row page size would need 51 fixtures for no
 * extra proof — the page number rides in the same validated search params
 * the filter and ordering do.
 */
test("restores an asset list's filter and ordering from the URL alone", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  // Two archetypes, so the filter visibly excludes something.
  await page.goto(PATHS.ASSETS_NEW);
  await page.getByLabel(app.assets.form.name, { exact: true }).fill("Poupança");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  await page.goto(PATHS.ASSETS_NEW);
  await page.getByRole("radio", { name: app.enums.archetype.CRYPTO }).click();
  await page.getByLabel(app.assets.form.name, { exact: true }).fill("Bitcoin");
  await page.getByLabel(app.assets.form.symbol, { exact: true }).fill("BTC");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // Filter to crypto and sort by name descending, through the UI.
  await page.getByRole("combobox", { name: app.assets.filter.label }).click();
  await page.getByRole("option", { name: app.enums.archetype.CRYPTO }).click();
  await page.getByRole("button", { name: app.assets.columns.name }).click();
  await page.getByRole("button", { name: app.assets.columns.name }).click();

  await expect(page.getByRole("row", { name: /Bitcoin/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Poupança/ })).toHaveCount(0);
  await expect(page).toHaveURL(/archetype=CRYPTO/);
  await expect(page).toHaveURL(/ordering=-name/);

  // The copied address restores the same view in a fresh navigation.
  const url = page.url();
  await page.goto(PATHS.APP);
  await page.goto(url);

  await expect(page.getByRole("row", { name: /Bitcoin/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Poupança/ })).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: app.assets.filter.label }),
  ).toHaveText(app.enums.archetype.CRYPTO);
});
