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
 * `v1-e2e-todo.md` Phase 9 — see a derived status on a holding.
 *
 * The verdict shows **with a label**, never colour alone, and the level the
 * effective target resolved from is visible — the match is a whole package and
 * never a blend, so naming the level is what makes the number accountable.
 *
 * The spec does not pin *which* verdict appears. The server derives it, and a
 * hard-coded `AHEAD` would be this spec asserting my arithmetic rather than the
 * stack's agreement. What is asserted is stronger and is what the roadmap
 * actually claims: the word comes from the four-word vocabulary, it is text
 * rather than a colour, and **the same word appears on the overview** — one
 * vocabulary, two screens.
 */
test("shows a labelled verdict and the level it resolved from", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  // A position with real elapsed time behind it: a status derived from zero
  // months would be a status about nothing.
  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2025-01-15",
    quantity_delta: "100",
    unit_price: "20.00",
    cash_delta: { amount: -200_000, currency: "BRL" },
  });

  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-08-01",
    price: "30.00",
  });

  await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: asset.id,
    steps: [{ from_month: 0, rate: "0.10", rate_period: "ANNUAL" }],
  });

  await page.goto(
    routeTo(PATHS.HOLDING_DETAIL, {
      accountId: account.id,
      assetId: asset.id,
    }),
  );

  const block = page.getByRole("region", { name: app.holding.target.title });
  await expect(block).toBeVisible();

  // The verdict is a word from the vocabulary, present as text. `PRODUCT.md`
  // forbids encoding financial state by colour alone, and a label is how that
  // is kept true here.
  const badge = block.getByText(new RegExp(`^(${VERDICTS.join("|")})$`));
  await expect(badge).toBeVisible();
  const verdict = (await badge.textContent())?.trim() ?? "";
  expect(VERDICTS).toContain(verdict);

  // Which level it came from — this holding's own target, since one exists.
  await expect(block.getByText(app.holding.target.from.HOLDING)).toBeVisible();

  // Both sides of the comparison are shown, so the verdict can be checked
  // rather than merely believed.
  await expect(block.getByText(app.holding.target.actual)).toBeVisible();
  await expect(block.getByText(app.holding.target.expected)).toBeVisible();

  // One vocabulary, two screens: the overview row carries the same word.
  await page.goto(PATHS.APP);
  await page.getByRole("tab", { name: accountName(account) }).click();
  const row = page
    .getByRole("region", { name: accountName(account) })
    .getByRole("row", { name: new RegExp(asset.name) });
  await expect(row.getByText(verdict)).toBeVisible();
});

test("names the account level when the target resolved from there", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, { name: "Vale", ticker: "VALE3" });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2025-03-10",
    quantity_delta: "50",
    unit_price: "60.00",
    cash_delta: { amount: -300_000, currency: "BRL" },
  });

  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-08-01",
    price: "70.00",
  });

  // No holding target — only the account's archetype default, so resolution
  // has to walk up a level and say that it did.
  await seedTarget(page, {
    scope: "ACCOUNT_ARCHETYPE",
    account: account.id,
    archetype: "EXCHANGE_SECURITY",
    steps: [{ from_month: 0, rate: "0.08", rate_period: "ANNUAL" }],
  });

  await page.goto(
    routeTo(PATHS.HOLDING_DETAIL, {
      accountId: account.id,
      assetId: asset.id,
    }),
  );

  const block = page.getByRole("region", { name: app.holding.target.title });

  await expect(
    block.getByText(
      app.holding.target.from.ACCOUNT_ARCHETYPE.replace(
        "{{archetype}}",
        app.enums.archetype.EXCHANGE_SECURITY,
      ).replace("{{account}}", accountName(account)),
    ),
  ).toBeVisible();

  // And it does not claim to be the holding's own.
  await expect(block.getByText(app.holding.target.from.HOLDING)).toHaveCount(0);
});
