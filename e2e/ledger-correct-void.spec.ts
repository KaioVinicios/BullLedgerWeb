import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — correct a movement, then void it.
 *
 * This journey was rewritten by the Phase 6 design and no longer asserts an
 * in-place edit, because there is no such operation: `/api/movements/{id}/` is
 * GET-only. Correcting writes a **successor** and voids the original, and the
 * screen has to be honest about that before the write rather than after it.
 */
test("corrects a movement into a successor, then voids it", async ({
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
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });

  await page.goto(PATHS.LEDGER);
  await page
    .getByRole("row", { name: /Petrobras/ })
    .getByRole("link")
    .first()
    .click();

  // Said before the correction is recorded, not after.
  await expect(page.getByText(app.ledger.correct.banner)).toBeVisible();

  await page.getByLabel(app.ledger.form.quantityAcquired).fill("12");
  await page.getByLabel(app.ledger.form.amountPaid).fill("232.80");
  await page.getByRole("button", { name: app.ledger.form.save }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));

  // The successor is what the ledger shows; the original is not deleted but
  // withdrawn, so the default list holds exactly one row.
  await expect(page.getByText(/-R\$\s?232\.80/)).toBeVisible();
  await expect(page.getByText(/-R\$\s?194\.00/)).toHaveCount(0);
  await expect(page.getByText(app.ledger.corrects)).toBeVisible();

  // …and the original comes back with the explicit ask, marked as voided.
  await page.getByRole("switch", { name: app.ledger.showVoided }).click();
  await expect(page.getByText(/-R\$\s?194\.00/)).toBeVisible();
  await expect(
    page.getByText(app.ledger.voidedBadge, { exact: true }),
  ).toBeVisible();
  await page.getByRole("switch", { name: app.ledger.showVoided }).click();

  // Now void the successor itself.
  await page
    .getByRole("row", { name: /Petrobras/ })
    .getByRole("button", { name: /Actions for/ })
    .click();
  await page.getByRole("menuitem", { name: app.ledger.void.action }).click();

  // The word is "void", and the dialog says the record survives.
  await expect(
    page.getByRole("alertdialog", { name: app.ledger.void.title }),
  ).toBeVisible();
  await expect(page.getByText(app.ledger.void.description)).toBeVisible();
  await page.getByRole("button", { name: app.ledger.void.confirm }).click();

  await expect(page.getByText(app.ledger.empty.title)).toBeVisible();

  // Nothing was deleted: both rows are one toggle away.
  await page.getByRole("switch", { name: app.ledger.showVoided }).click();
  await expect(
    page.getByText(app.ledger.voidedBadge, { exact: true }),
  ).toHaveCount(2);
});
