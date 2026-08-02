import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — inspect lots.
 *
 * Read-only, and the absence of every write affordance is the assertion. The
 * API can rename a lot and archive one; this screen does neither, because a
 * lot is opened by what you record rather than authored.
 */
test("shows how a holding's contributions were grouped, and offers no way to write", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  // Two contributions, so there is a grouping to look at.
  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });
  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-02-20",
    quantity_delta: "5",
    unit_price: "21.00",
    cash_delta: { amount: -10_500, currency: "BRL" },
  });

  await page.goto(PATHS.LEDGER_LOTS);
  // A lot means nothing outside one holding, so the screen asks for one first.
  await expect(
    page.getByText(app.ledger.lotsScreen.selectHolding),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: app.ledger.filters.account })
    .click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.ledger.filters.asset }).click();
  await page.getByRole("option", { name: asset.name, exact: true }).click();

  // Both contributions, each with what is left of it.
  await expect(
    page.getByRole("cell").getByText(app.ledger.lotsScreen.status.OPEN),
  ).toHaveCount(2);
  await expect(page.getByText(/R\$\s?194\.00/)).toBeVisible();
  await expect(page.getByText(/R\$\s?105\.00/)).toBeVisible();

  await expect(page.getByText(app.ledger.lotsScreen.readOnly)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /rename|archive/i }),
  ).toHaveCount(0);

  // And the holding survives a reload, because it lives in the URL.
  await page.reload();
  await expect(
    page.getByRole("cell").getByText(app.ledger.lotsScreen.status.OPEN),
  ).toHaveCount(2);
});
