import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createAccountUI } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 5 — create an account per country.
 *
 * The registration options offered must change with the selected country, an
 * invalid pairing must never be offerable, and where tax advantage attaches
 * must read correctly: account level in the US and Canada, instrument level
 * in Brazil, with the Previdência hybrid carrying its own fields.
 */
test("offers only the selected country's registrations, with tax fields in the right place", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  await page.goto(PATHS.ACCOUNTS_NEW);

  // Brazil is the default: its registrations and nobody else's, and the
  // instrument-level note — Brazil's tax advantage lives on assets.
  await expect(
    page.getByRole("radio", { name: app.enums.registration.BR_TAXABLE }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: app.enums.registration.CA_TFSA }),
  ).toHaveCount(0);
  await expect(
    page.getByText(app.accounts.form.instrumentAdvantageNote),
  ).toBeVisible();

  // The Previdência hybrid reveals account-level tax fields.
  await page
    .getByRole("radio", { name: app.enums.registration.BR_PREV_PGBL })
    .click();
  await expect(
    page.getByRole("switch", { name: app.accounts.form.deductible }),
  ).toBeVisible();

  // Canada: the whole set swaps, and the advantage attaches to the account.
  await page.getByRole("radio", { name: "Canada", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: app.enums.registration.BR_PREV_PGBL }),
  ).toHaveCount(0);
  await page
    .getByRole("radio", { name: app.enums.registration.CA_TFSA })
    .click();
  await expect(
    page.getByText(app.accounts.form.accountAdvantageNote),
  ).toBeVisible();
  await expect(
    page.getByLabel(app.accounts.form.contributionRoom, { exact: true }),
  ).toBeVisible();

  // One account per country, created for real.
  await createAccountUI(page, {
    name: "Conta BR",
    country: "Brazil",
    registration: app.enums.registration.BR_TAXABLE,
  });
  await createAccountUI(page, {
    name: "US brokerage",
    country: "United States",
    registration: app.enums.registration.US_TAXABLE,
  });
  await createAccountUI(page, {
    name: "Wealthsimple TFSA",
    country: "Canada",
    registration: app.enums.registration.CA_TFSA,
  });

  for (const name of ["Conta BR", "US brokerage", "Wealthsimple TFSA"]) {
    await expect(page.getByRole("row", { name })).toBeVisible();
  }
});
