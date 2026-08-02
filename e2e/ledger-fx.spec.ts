import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — record in a native currency different from the
 * account's base.
 *
 * Two facts, both recorded rather than derived: the amount in the currency it
 * actually moved in, and the rate that applied on the day it happened. Where
 * the currencies agree there is no question to ask, and the screen says so
 * instead of offering an input whose only valid answer is 1.
 */
test("captures the native amount and the event-date rate as recorded facts", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const apple = await seedSecurity(page, {
    name: "Apple",
    ticker: "AAPL",
    currency: "USD",
  });
  const local = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  const chooseHolding = async (assetName: string) => {
    await page.goto(PATHS.LEDGER_NEW);
    await page.getByRole("combobox", { name: app.ledger.form.account }).click();
    await page.getByRole("option", { name: account.name }).click();
    await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
    await page.getByRole("option", { name: assetName, exact: true }).click();
    await page.getByRole("combobox", { name: app.ledger.form.type }).click();
    await page
      .getByRole("option", { name: app.enums.movementType.DIVIDEND })
      .click();
  };

  // A BRL asset in a BRL account: one possible answer, so it is stated rather
  // than asked.
  await chooseHolding(local.name);
  await expect(page.getByText(app.ledger.form.fxSameCurrency)).toBeVisible();
  await expect(page.getByLabel(app.ledger.form.fxRate)).toHaveCount(0);

  // A USD asset in the same account: optional, blank by default, and what is
  // typed is recorded exactly as typed.
  await chooseHolding(apple.name);
  const rate = page.getByLabel(app.ledger.form.fxRate);
  await expect(rate).toHaveValue("");
  await expect(page.getByText(app.ledger.form.fxRateHint)).toBeVisible();

  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-03-04");
  await page.getByLabel(app.ledger.form.amountReceived).fill("12.00");
  await rate.fill("5.10");
  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  const row = page.getByRole("row", { name: /Apple/ });
  await expect(row.getByText(/US\$\s?12\.00|\$12\.00/)).toBeVisible();

  // The rate is readable where the movement is, as the fact it is — not
  // re-resolved, not rounded away.
  await row.getByRole("link").first().click();
  await expect(page.getByLabel(app.ledger.form.fxRate)).toHaveValue("5.1");
});
