import app from "@/i18n/locales/en/app.json" with { type: "json" };

import { expect, test } from "./support/fixtures";
import { createAccountUI, createInstitutionUI } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 5 — register a self-custody wallet, then an account
 * with no institution. The rule from `business-rules.md`: a self-custody
 * wallet's accounts may have no institution behind them, and the form must
 * permit exactly that.
 */
test("creates a self-custody wallet and an account with no institution", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  await createInstitutionUI(page, {
    name: "Ledger Nano",
    kinds: ["EXCHANGE"],
    selfCustody: true,
  });

  await expect(
    page
      .getByRole("row", { name: /Ledger Nano/ })
      .getByText(app.enums.selfCustody),
  ).toBeVisible();

  // The account form's default institution is "None — self-custody"; leaving
  // it untouched is the case under test.
  await createAccountUI(page, {
    name: "Cold storage",
    country: "United States",
    registration: app.enums.registration.US_TAXABLE,
  });

  const row = page.getByRole("row", { name: /Cold storage/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(app.accounts.noInstitution)).toBeVisible();
});
