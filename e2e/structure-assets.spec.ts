import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createInstitutionUI } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 5 — create one asset per archetype.
 *
 * Choosing an archetype reveals that archetype's own fields and hides the
 * others; each asset saves and lists; and no tax wrapper ever appears in an
 * asset-creation list — wrappers are account registrations, never assets.
 */
test("creates one asset of each archetype through its own field set", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createSignedInAccount(page, freshUser());

  // A certificate must name its issuing institution — a rule this spec
  // surfaced live — so the fixed-income step needs one to exist.
  await createInstitutionUI(page, { name: "Banco Inter", kinds: ["BANK"] });

  await page.goto(PATHS.ASSETS_NEW);

  // The type list is exactly the five archetypes — no 401(k), no TFSA.
  for (const label of Object.values(app.enums.archetype)) {
    await expect(page.getByRole("radio", { name: label })).toBeVisible();
  }
  await expect(
    page.getByRole("radio", { name: /TFSA|401|IRA|RRSP/ }),
  ).toHaveCount(0);
  await expect(page.getByText(app.assets.form.wrapperNote)).toBeVisible();

  // CASH_DEPOSIT — the default reveals its fields and not the others'.
  await expect(
    page.getByLabel(app.assets.form.compounding, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(app.assets.form.ticker, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel(app.assets.form.name, { exact: true })
    .fill("Poupança Nubank");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // FIXED_INCOME.
  await page.goto(PATHS.ASSETS_NEW);
  await page
    .getByRole("radio", { name: app.enums.archetype.FIXED_INCOME })
    .click();
  await expect(
    page.getByLabel(app.assets.form.maturityDate, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(app.assets.form.compounding, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel(app.assets.form.name, { exact: true })
    .fill("CDB 110% CDI");
  await page
    .getByLabel(app.assets.form.maturityDate, { exact: true })
    .fill("2030-01-15");
  await page.getByRole("combobox", { name: app.assets.form.issuer }).click();
  await page.getByRole("option", { name: "Banco Inter" }).click();
  // A CDB pays no coupons, and the form no longer asks: it omits both inputs
  // and sends a zero rate with a NONE frequency itself. This spec used to fill the rate
  // by hand, which is how the gap was found — the form offered a coupon the
  // API always rejects. The yield rides in `rate_value` instead.
  await expect(
    page.getByLabel(app.assets.form.couponRate, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel(app.assets.form.rateValue, { exact: true })
    .fill("13.75");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // EXCHANGE_SECURITY.
  await page.goto(PATHS.ASSETS_NEW);
  await page
    .getByRole("radio", { name: app.enums.archetype.EXCHANGE_SECURITY })
    .click();
  await expect(
    page.getByLabel(app.assets.form.ticker, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(app.assets.form.maturityDate, { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel(app.assets.form.name, { exact: true }).fill("Vale ON");
  await page.getByLabel(app.assets.form.ticker, { exact: true }).fill("VALE3");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // NAV_FUND.
  await page.goto(PATHS.ASSETS_NEW);
  await page.getByRole("radio", { name: app.enums.archetype.NAV_FUND }).click();
  await expect(
    page.getByLabel(app.assets.form.fundCategory, { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel(app.assets.form.name, { exact: true })
    .fill("Fundo Multimercado");
  await page
    .getByLabel(app.assets.form.fundCategory, { exact: true })
    .fill("Multimercado");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // CRYPTO.
  await page.goto(PATHS.ASSETS_NEW);
  await page.getByRole("radio", { name: app.enums.archetype.CRYPTO }).click();
  await expect(
    page.getByLabel(app.assets.form.symbol, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(app.assets.form.fundCategory, { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel(app.assets.form.name, { exact: true }).fill("Bitcoin");
  await page.getByLabel(app.assets.form.symbol, { exact: true }).fill("BTC");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // All five list, each labelled with its archetype.
  const rows: Array<[string, string]> = [
    ["Poupança Nubank", app.enums.archetype.CASH_DEPOSIT],
    ["CDB 110% CDI", app.enums.archetype.FIXED_INCOME],
    ["Vale ON", app.enums.archetype.EXCHANGE_SECURITY],
    ["Fundo Multimercado", app.enums.archetype.NAV_FUND],
    ["Bitcoin", app.enums.archetype.CRYPTO],
  ];
  for (const [name, archetype] of rows) {
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toBeVisible();
    await expect(row.getByText(archetype)).toBeVisible();
  }
});
