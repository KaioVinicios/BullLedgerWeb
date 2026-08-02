import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — record a buy, and see it in the ledger.
 *
 * The one journey everything else in the app is downstream of. What it proves
 * beyond "the form posts": the three figures round-trip exactly, and the fee
 * stays part of the trade instead of becoming a movement of its own.
 */
test("records a buy with a fee riding on the trade", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await page.goto(PATHS.LEDGER_NEW);
  await page.getByRole("combobox", { name: app.ledger.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
  await page.getByRole("option", { name: asset.name }).click();
  await page.getByRole("combobox", { name: app.ledger.form.type }).click();
  await page.getByRole("option", { name: app.enums.movementType.BUY }).click();

  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-03-04");
  await page.getByLabel(app.ledger.form.quantityAcquired).fill("10");
  await page.getByLabel(app.ledger.form.unitPrice).fill("19.40");
  await page.getByLabel(app.ledger.form.amountPaid).fill("204.00");
  await page.getByLabel(app.ledger.form.fee).fill("10.00");

  // 204.00 paid, of which 10.00 was fee → 194.00 gross, which is 10 × 19.40.
  await expect(page.getByText(/10 × R\$\s?19\.40/)).toBeVisible();

  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  const row = page.getByRole("row", { name: /Petrobras/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(app.enums.movementType.BUY)).toBeVisible();
  // Exactly what left the account, to the centavo, and ten units to two
  // decimal places of price — no precision lost on the way through.
  await expect(row.getByText(/-R\$\s?204\.00/)).toBeVisible();
  await expect(row.getByText("10", { exact: true })).toBeVisible();

  // The fee rode on this trade: it is noted on the trade's own row, and the
  // ledger holds that row and nothing else. A separate FEE movement would
  // misreport what happened.
  await expect(row.getByText(app.ledger.withFee)).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2); // header + the trade
});
