import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — back-date a movement.
 *
 * The order of the two entries is the whole design of this spec. The recent
 * one is recorded **first** and the old one second, so entry order and
 * real-world order disagree: a ledger sorted by when it was typed would put
 * the 2024 row on top, and only one sorted by `occurred_on` puts the 2026 one
 * there.
 */
test("sorts by the date it happened, not the date it was entered", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });

  const record = async (date: string, amount: string) => {
    await page.goto(PATHS.LEDGER_NEW);
    await page.getByRole("combobox", { name: app.ledger.form.account }).click();
    await page.getByRole("option", { name: account.name }).click();
    await page.getByRole("combobox", { name: app.ledger.form.type }).click();
    await page
      .getByRole("option", { name: app.enums.movementType.DEPOSIT })
      .click();
    await page.getByLabel(app.ledger.form.occurredOn).fill(date);
    await page.getByLabel(app.ledger.form.amountReceived).fill(amount);
    await page
      .getByRole("button", { name: app.ledger.form.create, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));
  };

  await record("2026-03-04", "300.00");
  // A late entry is an ordinary entry: no warning, no confirmation.
  await record("2024-11-02", "100.00");

  const amounts = page.getByRole("row").getByText(/R\$/);
  await expect(amounts.first()).toHaveText(/300\.00/);
  await expect(amounts.last()).toHaveText(/100\.00/);
});
