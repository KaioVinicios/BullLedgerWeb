import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { seedAccount, seedCrypto, seedTarget } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 9 — attempt a second target on the same scope.
 *
 * The rule is surfaced **before** submission, not as a server rejection after
 * the fact. The assertion that carries that word is the *absence of the submit
 * control*: a form that still offers "Create target" and then fails has not
 * surfaced anything early, however good its error message is.
 *
 * The API does reject it — `{"__all__": ["Constraint “target_unique_holding”
 * is violated."]}`, confirmed live — so this is a second line of defence being
 * kept in front of a first one, not the only one.
 */
test("surfaces a taken scope before submission, not after", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const bitcoin = await seedCrypto(page, { name: "Bitcoin", symbol: "BTC" });

  const existing = await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: bitcoin.id,
    steps: [{ from_month: 0, rate: "0.20", rate_period: "ANNUAL" }],
  });

  await page.goto(PATHS.TARGETS_NEW);

  await page
    .getByRole("radio", { name: app.enums.targetScope.HOLDING })
    .click();
  await page.getByRole("combobox", { name: app.targets.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.targets.form.asset }).click();
  await page.getByRole("option", { name: bitcoin.name }).click();

  // Named, so the user knows *which* scope they landed on rather than being
  // told a rule in the abstract.
  await expect(
    page.getByText(
      app.targets.form.taken.title.replace(
        "{{name}}",
        `${bitcoin.name} · ${account.name}`,
      ),
    ),
  ).toBeVisible();

  // The point of the whole journey: there is nothing left to submit.
  await expect(
    page.getByRole("button", { name: app.targets.form.create }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel(app.targets.form.steps.rate.replace("{{index}}", "1")),
  ).toHaveCount(0);

  // And the useful next move is offered: edit the one that already exists.
  await page.getByRole("link", { name: app.targets.form.taken.action }).click();
  await expect(page).toHaveURL(new RegExp(`${existing.id}`));
  // `exact`, because the create form's per-level hints all open with these two
  // words. A substring match resolves to three of them and cannot tell a
  // still-mounted create form from the edit screen this line is asserting.
  await expect(
    page.getByText(app.targets.form.scopeFixed, { exact: true }),
  ).toBeVisible();
});

test("still offers a scope one level up, which is a different scope", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const bitcoin = await seedCrypto(page, { name: "Bitcoin", symbol: "BTC" });

  await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: bitcoin.id,
    steps: [{ from_month: 0, rate: "0.20", rate_period: "ANNUAL" }],
  });

  await page.goto(PATHS.TARGETS_NEW);

  // A holding target and its account's archetype default coexist by design —
  // that is what a three-level hierarchy is for. Blocking this would be the
  // expensive way to get the rule wrong.
  await page
    .getByRole("radio", { name: app.enums.targetScope.ACCOUNT_ARCHETYPE })
    .click();
  await page.getByRole("combobox", { name: app.targets.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page
    .getByRole("combobox", { name: app.targets.form.archetype })
    .click();
  await page.getByRole("option", { name: app.enums.archetype.CRYPTO }).click();

  await expect(
    page.getByRole("button", { name: app.targets.form.create }),
  ).toBeVisible();
});
