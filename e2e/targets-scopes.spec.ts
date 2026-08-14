import type { Page } from "@playwright/test";

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

/**
 * A rung, by the group it is announced as.
 *
 * The ladder's field labels carry no index of their own — "Aim for", "From
 * month", "Period" read the same on every rung, and each rung is a labelled
 * `group` that supplies the position. So every field query here goes through
 * this. Asking the page for "Aim for" directly is ambiguous the moment a
 * second rung exists, and was: it passed only while these blocks authored one
 * rung each.
 */
const rung = (page: Page, index: number) =>
  page.getByRole("group", {
    name: app.targets.form.steps.rung.replace("{{index}}", String(index)),
  });

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
    rung(page, 1).getByLabel(app.targets.form.steps.fromMonth),
  ).toHaveCount(0);

  await rung(page, 1).getByLabel(app.targets.form.steps.rate).fill("1.5");
  await rung(page, 1)
    .getByRole("combobox", { name: app.targets.form.steps.period })
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

  await rung(page, 1).getByLabel(app.targets.form.steps.rate).fill("3");
  await rung(page, 1)
    .getByRole("combobox", { name: app.targets.form.steps.period })
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

  await rung(page, 1).getByLabel(app.targets.form.steps.rate).fill("20");
  await page.getByRole("button", { name: app.targets.form.steps.add }).click();
  await rung(page, 2).getByLabel(app.targets.form.steps.fromMonth).fill("24");
  await rung(page, 2).getByLabel(app.targets.form.steps.rate).fill("12");

  await page.getByRole("button", { name: app.targets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.TARGETS}$`));

  // ---- Each landed under its own level's heading -------------------------
  // The three headings in resolution order are what the screen exists to
  // teach, so a target appearing under the wrong one is a real failure.
  //
  // A link rather than a row: the list is cards now, and the target's name is
  // the link on its card. The *name* is the assertion — an unnamed
  // `getByRole("link")` would pass on any card at all, including one for the
  // wrong target, which is the failure this block exists to catch.
  const section = (scope: keyof typeof app.enums.targetScope) =>
    page.getByRole("region", { name: app.enums.targetScope[scope] });

  await expect(
    section("HOLDING").getByRole("link", { name: /Bitcoin.*Corretora/ }),
  ).toBeVisible();
  await expect(
    section("ACCOUNT_ARCHETYPE").getByRole("link", {
      name: new RegExp(`${app.enums.archetype.EXCHANGE_SECURITY}.*Corretora`),
    }),
  ).toBeVisible();
  await expect(
    section("PORTFOLIO_ARCHETYPE").getByRole("link", {
      name: new RegExp(app.enums.archetype.CRYPTO),
    }),
  ).toBeVisible();

  // The portfolio ladder kept both rungs. The card reads the whole ladder, so
  // the proof is the second rung's own rate and its timing in words — not a
  // count of the rungs that were hidden, which is what the table showed.
  const secondRung = app.targets.sentence.stepJoin
    .replace(
      "{{rate}}",
      app.targets.sentence.rate
        .replace("{{rate}}", "12%")
        .replace("{{period}}", app.enums.period.ANNUAL),
    )
    .replace(
      "{{when}}",
      app.targets.sentence.when.last.replace("{{from}}", "24"),
    );

  await expect(
    section("PORTFOLIO_ARCHETYPE").getByText(secondRung),
  ).toBeVisible();

  // ---- The rates round-trip, in the period each was authored in ----------
  await section("HOLDING")
    .getByRole("link", { name: /Bitcoin/ })
    .click();

  await expect(
    rung(page, 1).getByLabel(app.targets.form.steps.rate),
  ).toHaveValue("1.50");
  // Stored as the fraction 0.015 and re-rendered as a percent: the shift this
  // phase performs most often, proved by the number coming back as authored.
  //
  // Two places rather than the one that was filled, and deliberately: the
  // percent field fills from the right at `MASK_PLACES`, so a prefill of `1.5`
  // would be re-read as the digits `15` by the next keystroke and land on
  // `0.15`. Same value, padded to the width the field types at.
  await expect(
    rung(page, 1).getByRole("combobox", {
      name: app.targets.form.steps.period,
    }),
  ).toHaveText(app.enums.period.MONTHLY);

  // The scope is not a control on an edit — a target for another scope is
  // another target, which the update schema says by carrying no scope at all.
  await expect(
    page.getByRole("radio", { name: app.enums.targetScope.HOLDING }),
  ).toHaveCount(0);
  // `exact`, because the create form's per-level hints all open with these two
  // words — "Applies to that one asset in that one account." and its two
  // siblings — and a substring match resolves to three of them there. The
  // badge is the whole label, so matching it whole says the edit screen is the
  // one on screen rather than a still-mounted create form.
  await expect(
    page.getByText(app.targets.form.scopeFixed, { exact: true }),
  ).toBeVisible();
});
