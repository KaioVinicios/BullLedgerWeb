import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedCrypto } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — transfer crypto between the user's own wallets.
 *
 * Rewritten by the Phase 6 design: this drives **one** transfer route rather
 * than two manual movements, because `POST /api/movements/` rejects
 * `TRANSFER_IN` and `TRANSFER_OUT` outright — writing one leg without the
 * other would leave value that departed an account and arrived nowhere.
 *
 * The domain claim under test is the one a user arrives doubting: moving your
 * own coins between your own wallets is not a sale, carries its basis across,
 * and realizes no gain.
 */
test("moves crypto between the user's own wallets as one transfer", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const exchange = await seedAccount(page, { name: "Exchange" });
  const wallet = await seedAccount(page, { name: "Carteira fria" });
  const bitcoin = await seedCrypto(page, { name: "Bitcoin", symbol: "BTC" });

  await recordMovement(page, {
    account: exchange.id,
    asset: bitcoin.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: "1.5",
    unit_price: "200000.00",
    cash_delta: { amount: -30_000_000, currency: "BRL" },
  });

  await page.goto(PATHS.LEDGER_TRANSFER);

  // On the screen from the first render, because the misconception it corrects
  // is the one the user arrives with.
  await expect(page.getByText(app.ledger.transferForm.basisNote)).toBeVisible();

  await page
    .getByRole("combobox", { name: app.ledger.transferForm.source })
    .click();
  await page.getByRole("option", { name: exchange.name }).click();
  await page
    .getByRole("combobox", { name: app.ledger.transferForm.destination })
    .click();
  await page.getByRole("option", { name: wallet.name }).click();
  await page
    .getByRole("combobox", { name: app.ledger.transferForm.asset })
    .click();
  await page.getByRole("option", { name: bitcoin.name, exact: true }).click();

  // Units move; cash does not. There is no amount to type.
  await expect(page.getByLabel(app.ledger.transferForm.amount)).toHaveCount(0);
  await page.getByLabel(app.ledger.transferForm.quantity).fill("0.5");
  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-03-04");

  await page
    .getByRole("combobox", { name: app.ledger.transferForm.sourceLot })
    .click();
  await page.getByRole("option").first().click();

  await page
    .getByRole("button", { name: app.ledger.transferForm.create })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  // Two legs, each named as part of a transfer, and neither moving money.
  await expect(page.getByText(app.ledger.transferLeg)).toHaveCount(2);
  const legs = page.getByRole("row", { name: /Bitcoin/ });
  await expect(legs.getByText(/R\$\s?0\.00/)).toHaveCount(2);

  // Nothing was realized: the contribution it came out of shows no gain.
  await page.goto(
    `${PATHS.LEDGER_LOTS}?account=${exchange.id}&asset=${bitcoin.id}`,
  );
  const lot = page.getByRole("row").filter({ hasText: /Open/ }).first();
  await expect(lot.getByText(/R\$\s?0\.00/).first()).toBeVisible();
});
