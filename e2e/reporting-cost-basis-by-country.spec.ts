import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 8 — compare the same movements across two countries.
 *
 * Cost-basis method is determined by the *account's* country and computed in
 * the projection: BR and CA use a weighted average, the US uses FIFO. The same
 * movements therefore yield different realized gains in a US and a BR account,
 * which is correct and by design — and unless the screen says which method it
 * used, the divergence reads to a user as a bug.
 *
 * The method is the one rule in this phase the API does not publish, so this
 * spec is what keeps the client's copy of it honest against a real account.
 */
test("states the method each account's country uses", async ({ page }) => {
  await createSignedInAccount(page, freshUser());

  const brAccount = await seedAccount(page, {
    name: "Corretora BR",
    country: "BR",
    registration: "BR_TAXABLE",
    base_currency: "BRL",
  });
  const usAccount = await seedAccount(page, {
    name: "Brokerage US",
    country: "US",
    registration: "US_TAXABLE",
    base_currency: "USD",
  });

  const brAsset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });
  const usAsset = await seedSecurity(page, {
    name: "Apple",
    ticker: "AAPL",
    currency: "USD",
  });

  // Identical movements, one in each account.
  for (const [account, asset, currency] of [
    [brAccount, brAsset, "BRL"],
    [usAccount, usAsset, "USD"],
  ] as const) {
    await recordMovement(page, {
      account: account.id,
      asset: asset.id,
      type: "BUY",
      occurred_on: "2026-01-10",
      quantity_delta: "100",
      unit_price: "20.00",
      cash_delta: { amount: -200_000, currency },
    });
  }

  await page.goto(`${PATHS.APP}/holdings/${brAccount.id}/${brAsset.id}`);
  await expect(
    page.getByText(app.enums.costBasisMethod.WEIGHTED_AVERAGE),
  ).toBeVisible();
  await expect(page.getByText(app.enums.costBasisMethod.FIFO)).toHaveCount(0);

  await page.goto(`${PATHS.APP}/holdings/${usAccount.id}/${usAsset.id}`);
  await expect(page.getByText(app.enums.costBasisMethod.FIFO)).toBeVisible();
  await expect(
    page.getByText(app.enums.costBasisMethod.WEIGHTED_AVERAGE),
  ).toHaveCount(0);

  // And the reason is stated, not left for the user to infer from two
  // different words.
  await expect(page.getByText(app.holding.basis.explanation)).toBeVisible();
});
