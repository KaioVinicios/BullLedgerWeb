import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — record a split and a bonus.
 *
 * Both change the unit count and neither moves money, which is exactly what a
 * form built around an amount field tends to get wrong. The position is read
 * from the projection rather than computed here, so asserting on it is
 * asserting that the server agreed.
 */
test("records a split and a bonus without inventing a cash movement", async ({
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
    quantity_delta: "15",
    unit_price: "20.00",
    cash_delta: { amount: -30_000, currency: "BRL" },
  });

  const openForm = async (type: string) => {
    await page.goto(PATHS.LEDGER_NEW);
    await page.getByRole("combobox", { name: app.ledger.form.account }).click();
    await page.getByRole("option", { name: account.name }).click();
    await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
    await page.getByRole("option", { name: asset.name, exact: true }).click();
    await page.getByRole("combobox", { name: app.ledger.form.type }).click();
    await page.getByRole("option", { name: type }).click();
  };

  // A 3:1 split on 15 units adds 30. The ratio stays the user's to convert,
  // and the position they convert from is on the screen.
  await openForm(app.enums.movementType.SPLIT);
  await expect(page.getByText(/Currently held: 15/)).toBeVisible();
  await expect(page.getByLabel(app.ledger.form.amountReceived)).toHaveCount(0);
  await expect(page.getByLabel(app.ledger.form.amountPaid)).toHaveCount(0);

  await page
    .getByRole("radio", { name: app.ledger.form.directionGained })
    .click();
  await page.getByLabel(app.ledger.form.quantityChanged).fill("30");
  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-02-01");
  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  // A bonus issue only ever adds, so it asks for no direction at all.
  await openForm(app.enums.movementType.BONUS);
  await expect(
    page.getByRole("radio", { name: app.ledger.form.directionLost }),
  ).toHaveCount(0);
  await page.getByLabel(app.ledger.form.quantityGranted).fill("5");
  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-02-15");
  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  const split = page.getByRole("row", {
    name: new RegExp(app.enums.movementType.SPLIT),
  });
  await expect(split.getByText("30", { exact: true })).toBeVisible();
  await expect(split.getByText(/R\$\s?0\.00/)).toBeVisible();

  // 15 bought, 30 from the split, 5 granted — read back from the projection.
  await openForm(app.enums.movementType.SPLIT);
  await expect(page.getByText(/Currently held: 50/)).toBeVisible();
});
