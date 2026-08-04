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
 * `v1-e2e-todo.md` Phase 8 — read a holding in detail.
 *
 * Built from several movements including a sale, so realized and unrealized
 * gain are both real figures rather than zeros that would pass the assertion
 * without proving anything.
 */
test("reads a holding built from several movements, including a sale", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  const buy = await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: "100",
    unit_price: "20.00",
    cash_delta: { amount: -200_000, currency: "BRL" },
  });

  // An exit names the lot it draws from — the rule that makes half the
  // taxonomy recordable at all.
  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "SELL",
    occurred_on: "2026-04-15",
    quantity_delta: "-40",
    unit_price: "26.00",
    cash_delta: { amount: 104_000, currency: "BRL" },
    lot: buy.lot,
  });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "DIVIDEND",
    occurred_on: "2026-05-02",
    cash_delta: { amount: 4_800, currency: "BRL" },
  });

  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-06-01",
    price: "28.00",
  });

  await page.goto(`${PATHS.APP}/holdings/${account.id}/${asset.id}`);

  await expect(page.getByRole("heading", { name: asset.name })).toBeVisible();
  await expect(page.getByText(account.name)).toBeVisible();

  // Every figure 8.3 asks for is present and internally consistent: 60 units
  // left at 28.00 is 1,680.00, and the realized gain on 40 sold at 26.00
  // against a 20.00 basis is 240.00.
  await expect(page.getByText("R$1,680.00").first()).toBeVisible();
  await expect(page.getByText("+R$240.00").first()).toBeVisible();

  // Income is recorded and shown as its own figure, not folded into gain.
  await expect(page.getByText("R$48.00").first()).toBeVisible();

  // The cost-basis method in effect is *stated*, so a user comparing two
  // countries understands why identical movements diverge.
  await expect(
    page.getByText(app.enums.costBasisMethod.WEIGHTED_AVERAGE),
  ).toBeVisible();

  // Tax attributes read as information. The words this must never say are the
  // point of the assertion.
  await expect(page.getByText(app.holding.tax.disclaimer)).toBeVisible();
  await expect(page.getByText(/tax (owed|due|payable)/i)).toHaveCount(0);

  // A single-currency holding shows one value column, not the same number
  // twice: BRL asset in a BRL account.
  const figures = page.getByRole("table", { name: app.holding.figures.title });
  await expect(figures.getByRole("columnheader")).toHaveCount(2);

  // Each figure links back to the movements that produced it.
  await page.getByRole("link", { name: app.holding.seeMovements }).click();
  await expect(page).toHaveURL(
    new RegExp(`account=${account.id}.*asset=${asset.id}`),
  );
});

test("shows both currency columns when the asset and account differ", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Apple",
    ticker: "AAPL",
    currency: "USD",
  });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-02-10",
    quantity_delta: "10",
    unit_price: "180.00",
    cash_delta: { amount: -180_000, currency: "USD" },
    fx_rate: "5.00",
  });

  await page.goto(`${PATHS.APP}/holdings/${account.id}/${asset.id}`);

  const figures = page.getByRole("table", { name: app.holding.figures.title });

  // Label plus native plus base: the provenance of a cross-currency holding is
  // the thing the collapse rule exists to preserve.
  await expect(figures.getByRole("columnheader")).toHaveCount(3);

  // The caption, not the header row — both legitimately name the currencies,
  // and it is the caption that says which is the asset's and which the
  // account's in a full sentence.
  await expect(
    page.getByText("Figures below in USD (asset) and BRL (account)."),
  ).toBeVisible();
});
