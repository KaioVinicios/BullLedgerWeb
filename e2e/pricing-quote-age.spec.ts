import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 7 — a quote older than the valuation date.
 *
 * This replaced "encounter a stale rate or price", which asked for a verdict
 * the server does not emit: the API reports absence, never the age of a figure
 * it did produce. So what is asserted is the dated fact the client can honestly
 * state — both dates, side by side, with the relationship named in words.
 */
test("states a quote's date against the valuation date", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });

  // Deliberately back-dated, and the asset's only quote — so the assertion
  // holds whichever order the list is served in.
  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-01-15",
    price: "19.40",
  });

  await page.goto(`${PATHS.PRICING}?asset=${asset.id}`);

  // Both dates stated. The valuation date is the server's `on_date`, which
  // defaults to today, so the quote necessarily precedes it.
  await expect(page.getByText(/Last quote/)).toBeVisible();
  await expect(page.getByText(/valued/)).toBeVisible();

  // And the relationship named in words, never by a shade alone.
  await expect(page.getByText(app.pricing.age.precedesValuation)).toBeVisible();
});

test("says nothing about age when no single asset is in view", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });
  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-01-15",
    price: "19.40",
  });

  await page.goto(PATHS.PRICING);
  // Two rows, and both are real: the purchase above seeded a `TRADE` quote for
  // its own day, and `seedPriceQuote` added a `MANUAL` one five days later.
  // The claim under test is about the *age note*, not about how many quotes an
  // asset has, so this asserts the table is populated and leaves the count to
  // the specs that own it.
  await expect(
    page.getByRole("row", { name: /Petrobras/ }).first(),
  ).toBeVisible();

  // Unfiltered, the newest row is the newest across the whole portfolio and
  // says nothing about any one asset. Claiming otherwise would be a lie the
  // moment a second asset is priced.
  await expect(page.getByText(app.pricing.age.precedesValuation)).toBeHidden();
});
