import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  accountName,
  recordMovement,
  seedAccount,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 7 — price an asset that has none.
 *
 * The journey Phase 7 exists for. What it proves beyond "the form posts": the
 * server itself reports the holding as unvaluable, the screen names it rather
 * than rendering a zero, and recording the price makes the server stop
 * reporting it — which is the projection re-reading, observed rather than
 * assumed.
 */
test("names a holding with no price, then prices it", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  // A position, so the rollup has something it needs a price for. Without a
  // holding there is nothing to value and nothing to report as missing.
  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });

  await page.goto(PATHS.PRICING);

  // Named, not counted, and never rendered as a value of zero.
  const coverage = page.getByRole("region", {
    name: app.pricing.coverage.title,
  });
  await expect(coverage).toBeVisible();
  await expect(coverage.getByText(asset.name)).toBeVisible();
  await expect(coverage.getByText(accountName(account))).toBeVisible();

  await coverage
    .getByRole("link", { name: app.pricing.coverage.priceIt })
    .click();

  // The prefill is the whole point of arriving this way: the user should not
  // have to re-answer the question the block just asked them about.
  await expect(
    page.getByRole("combobox", { name: app.pricing.form.asset }),
  ).toHaveText(new RegExp(asset.name));

  await page
    .getByLabel(app.pricing.form.date, { exact: true })
    .fill("2026-08-02");
  // `exact` is load-bearing: Playwright's getByLabel matches substrings, and
  // the form landmark is named "Record a price quote" — which contains this
  // field's own label. Testing Library's getByLabelText is exact by default,
  // so the component test never saw this.
  await page.getByLabel(app.pricing.form.price, { exact: true }).fill("34.10");
  await page.getByRole("button", { name: app.pricing.form.create }).click();

  await expect(page).toHaveURL(new RegExp(`${PATHS.PRICING}\\?asset=`));

  // The row is there, marked as the user's own entry rather than the feed's.
  // 34.10 renders as 34.1: the server canonicalizes the decimal it stores, and
  // the screen formats whatever string arrives rather than the one it sent.
  const row = page.getByRole("row", { name: new RegExp(asset.name) });
  await expect(row).toBeVisible();
  // The currency rides in its own span beside the figure, so the price cell
  // reads "34.1 BRL" rather than a single exact node.
  await expect(row).toContainText("34.1");
  await expect(row).toContainText("BRL");
  await expect(row.getByText(app.enums.priceSource.MANUAL)).toBeVisible();

  // And the projection re-read: the server no longer reports this holding as
  // one it could not value.
  await expect(
    page.getByRole("region", { name: app.pricing.coverage.title }),
  ).toBeHidden();
});
