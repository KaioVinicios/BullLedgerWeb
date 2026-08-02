import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — record money out without typing a negative
 * number.
 *
 * The UI's language *is* the assertion: the field says "total paid", the value
 * typed into it has no sign, and what reaches the API is negative anyway.
 */
test("records money out without a minus sign ever being typed", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });

  // Money has to be in the account before any can leave it.
  await recordMovement(page, {
    account: account.id,
    type: "DEPOSIT",
    occurred_on: "2026-03-01",
    cash_delta: { amount: 100_000, currency: "BRL" },
  });

  await page.goto(PATHS.LEDGER_NEW);
  await page.getByRole("combobox", { name: app.ledger.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.ledger.form.type }).click();
  await page
    .getByRole("option", { name: app.enums.movementType.WITHDRAWAL })
    .click();

  const amount = page.getByLabel(app.ledger.form.amountPaid);
  await amount.fill("250.00");
  await expect(amount).toHaveValue("250.00");

  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  // And the ledger shows it leaving the account.
  await expect(page.getByText(/-R\$\s?250\.00/)).toBeVisible();
});
