import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { routeTo } from "./support/config";
import {
  accountName,
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
  seedTarget,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

const VERDICTS = Object.values(app.enums.targetStatus);

/**
 * `v1-e2e-todo.md` Phase 9 — see a holding matched by no target.
 *
 * It simply has no status. Not an error, not a warning, not a zero — three
 * things the screen could plausibly have done instead, and all three would be
 * the interface inventing a judgement the server declined to make.
 *
 * The uncovered holding sits *beside* a covered one, deliberately: a screen
 * that shows no verdict because nothing works at all would pass a weaker
 * version of this test.
 */
test("leaves a holding no target covers without a status", async ({ page }) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const covered = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });
  const uncovered = await seedSecurity(page, { name: "Vale", ticker: "VALE3" });

  for (const asset of [covered, uncovered]) {
    await recordMovement(page, {
      account: account.id,
      asset: asset.id,
      type: "BUY",
      occurred_on: "2025-02-20",
      quantity_delta: "100",
      unit_price: "20.00",
      cash_delta: { amount: -200_000, currency: "BRL" },
    });
    await seedPriceQuote(page, {
      asset: asset.id,
      date: "2026-08-01",
      price: "25.00",
    });
  }

  // A target on one holding only. The other is outside every scope: no
  // account default and no portfolio default exist to fall back to.
  await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: covered.id,
    steps: [{ from_month: 0, rate: "0.10", rate_period: "ANNUAL" }],
  });

  await page.goto(
    routeTo(PATHS.HOLDING_DETAIL, {
      accountId: account.id,
      assetId: uncovered.id,
    }),
  );

  const block = page.getByRole("region", { name: app.holding.target.title });

  await expect(block.getByText(app.holding.target.none)).toBeVisible();

  // None of the four verdicts, anywhere on the page — including a zero
  // dressed as one.
  for (const verdict of VERDICTS) {
    await expect(page.getByText(verdict, { exact: true })).toHaveCount(0);
  }

  // Not an error and not a warning: nothing on this page is announced as one.
  await expect(page.getByRole("alert")).toHaveCount(0);

  // The covered holding does have one, so the absence above is about scope
  // rather than about the feature being dead.
  await page.goto(
    routeTo(PATHS.HOLDING_DETAIL, {
      accountId: account.id,
      assetId: covered.id,
    }),
  );
  await expect(
    page
      .getByRole("region", { name: app.holding.target.title })
      .getByText(new RegExp(`^(${VERDICTS.join("|")})$`)),
  ).toBeVisible();

  // On the overview the uncovered row's status cell is empty — an em dash
  // would read as "measured, and nothing".
  await page.goto(PATHS.APP);
  await page.getByRole("tab", { name: accountName(account) }).click();

  // Scoped to the account's own block: the by-asset table on the same screen
  // carries a row per asset too, and an unscoped row locator matches both.
  const uncoveredRow = page
    .getByRole("region", { name: accountName(account) })
    .getByRole("row", { name: new RegExp(uncovered.name) });
  await expect(uncoveredRow).toBeVisible();

  // The status column is the last one. Asserted on that cell rather than on
  // the row, because an em dash elsewhere in the row is legitimate — a null
  // return really is unknown — and only *here* would it read as "measured,
  // and nothing".
  const status = uncoveredRow.getByRole("cell").last();
  await expect(status).toBeEmpty();
});
