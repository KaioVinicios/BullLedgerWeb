import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount, seedCrypto, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 9 — set a target at each of the three scopes.
 *
 * Each level saves with its ladder intact, and a rate authored in any period
 * round-trips. The three targets deliberately use three different periods:
 * a rate stored as a fraction and re-rendered as a percent is the conversion
 * this phase does most often, and a round trip is the only honest proof of it.
 *
 * Driven through the form rather than seeded, because authoring *is* the
 * journey here.
 */
const stepLabel = (template: string, index: number) =>
  template.replace("{{index}}", String(index));

test("sets a target at each of the three scopes, each ladder intact", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const bitcoin = await seedCrypto(page, { name: "Bitcoin", symbol: "BTC" });
  await seedSecurity(page, { name: "Petrobras", ticker: "PETR4" });

  // ---- HOLDING, authored MONTHLY ----------------------------------------
  await page.goto(PATHS.TARGETS_NEW);

  await page
    .getByRole("radio", { name: app.enums.targetScope.HOLDING })
    .click();
  await page.getByRole("combobox", { name: app.targets.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.targets.form.asset }).click();
  await page.getByRole("option", { name: bitcoin.name }).click();

  // The first step's month is fixed at 0 — the API requires a rung there, so
  // the form does not offer the field at all.
  await expect(
    page.getByLabel(stepLabel(app.targets.form.steps.fromMonth, 1)),
  ).toHaveCount(0);

  await page.getByLabel(stepLabel(app.targets.form.steps.rate, 1)).fill("1.5");
  await page
    .getByRole("combobox", {
      name: stepLabel(app.targets.form.steps.period, 1),
    })
    .click();
  await page.getByRole("option", { name: app.enums.period.MONTHLY }).click();

  await page.getByRole("button", { name: app.targets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.TARGETS}$`));

  // ---- ACCOUNT × ARCHETYPE, authored QUARTERLY ---------------------------
  await page.goto(PATHS.TARGETS_NEW);

  await page
    .getByRole("radio", { name: app.enums.targetScope.ACCOUNT_ARCHETYPE })
    .click();
  await page.getByRole("combobox", { name: app.targets.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page
    .getByRole("combobox", { name: app.targets.form.archetype })
    .click();
  await page
    .getByRole("option", { name: app.enums.archetype.EXCHANGE_SECURITY })
    .click();

  await page.getByLabel(stepLabel(app.targets.form.steps.rate, 1)).fill("3");
  await page
    .getByRole("combobox", {
      name: stepLabel(app.targets.form.steps.period, 1),
    })
    .click();
  await page.getByRole("option", { name: app.enums.period.QUARTERLY }).click();

  await page.getByRole("button", { name: app.targets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.TARGETS}$`));

  // ---- PORTFOLIO × ARCHETYPE, authored ANNUAL, with a second rung --------
  await page.goto(PATHS.TARGETS_NEW);

  await page
    .getByRole("radio", { name: app.enums.targetScope.PORTFOLIO_ARCHETYPE })
    .click();
  await page
    .getByRole("combobox", { name: app.targets.form.archetype })
    .click();
  await page.getByRole("option", { name: app.enums.archetype.CRYPTO }).click();

  await page.getByLabel(stepLabel(app.targets.form.steps.rate, 1)).fill("20");
  await page.getByRole("button", { name: app.targets.form.steps.add }).click();
  await page
    .getByLabel(stepLabel(app.targets.form.steps.fromMonth, 2))
    .fill("24");
  await page.getByLabel(stepLabel(app.targets.form.steps.rate, 2)).fill("12");

  await page.getByRole("button", { name: app.targets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.TARGETS}$`));

  // ---- Each landed under its own level's heading -------------------------
  // The three headings in resolution order are what the screen exists to
  // teach, so a row appearing under the wrong one is a real failure.
  const section = (scope: keyof typeof app.enums.targetScope) =>
    page.getByRole("region", { name: app.enums.targetScope[scope] });

  await expect(
    section("HOLDING").getByRole("row", { name: /Bitcoin.*Corretora/ }),
  ).toBeVisible();
  await expect(
    section("ACCOUNT_ARCHETYPE").getByRole("row", {
      name: new RegExp(`${app.enums.archetype.EXCHANGE_SECURITY}.*Corretora`),
    }),
  ).toBeVisible();
  await expect(
    section("PORTFOLIO_ARCHETYPE").getByRole("row", {
      name: new RegExp(app.enums.archetype.CRYPTO),
    }),
  ).toBeVisible();

  // The portfolio ladder kept both rungs, and the summary leads with the rate
  // rather than a count.
  await expect(
    section("PORTFOLIO_ARCHETYPE").getByText(
      app.targets.moreSteps.replace("{{count}}", "1"),
    ),
  ).toBeVisible();

  // ---- The rates round-trip, in the period each was authored in ----------
  await section("HOLDING")
    .getByRole("link", { name: /Bitcoin/ })
    .click();

  await expect(
    page.getByLabel(stepLabel(app.targets.form.steps.rate, 1)),
  ).toHaveValue("1.5");
  // Stored as the fraction 0.015 and re-rendered as a percent: the shift this
  // phase performs most often, proved by the number coming back as typed.
  await expect(
    page.getByRole("combobox", {
      name: stepLabel(app.targets.form.steps.period, 1),
    }),
  ).toHaveText(app.enums.period.MONTHLY);

  // The scope is not a control on an edit — a target for another scope is
  // another target, which the update schema says by carrying no scope at all.
  await expect(
    page.getByRole("radio", { name: app.enums.targetScope.HOLDING }),
  ).toHaveCount(0);
  await expect(page.getByText(app.targets.form.scopeFixed)).toBeVisible();
});
