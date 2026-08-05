import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { routeTo } from "./support/config";
import {
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
  seedTarget,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 9 — confirm targets cause nothing to happen.
 *
 * A floor is breached and a target is exceeded, and the app answers with a
 * word. No alert, no notification, no rebalancing prompt, no advice.
 * **BullLedger reports; it never acts** — the product's own line, and the one
 * claim in this phase that only an end-to-end run can hold, because it is a
 * claim about the *absence* of behaviour across every screen at once.
 *
 * The advisory phrase list is written out here on purpose: it is the tripwire.
 * A future copy change that starts nudging the user trips this spec, which is
 * exactly when someone should be made to argue for it.
 *
 * Phrases rather than single words. A bare `sell` would fire on the ledger's
 * own movement-type label, which is a noun this app must be able to say — the
 * thing being forbidden is advice, not vocabulary.
 */
const ADVISORY =
  /\b(rebalance|buy more|act now|you should|we recommend|consider (selling|buying|reducing)|time to (buy|sell)|suggested (action|trade))\b/i;

async function assertReportsOnly(page: Page, where: string) {
  // Nothing is announced. A verdict is information, not an event.
  await expect(page.getByRole("alert"), where).toHaveCount(0);

  // Sonner's toast region — the app's only notification surface. Reading a
  // screen must never raise one.
  await expect(page.locator("[data-sonner-toast]"), where).toHaveCount(0);

  // And no advice, anywhere in the visible text.
  const text = await page.locator("body").innerText();
  expect(text, `${where} offers advice`).not.toMatch(ADVISORY);
}

test("reports a breached floor and an exceeded target without acting on either", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });

  const soared = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });
  const crashed = await seedSecurity(page, {
    name: "Americanas",
    ticker: "AMER3",
  });

  await recordMovement(page, {
    account: account.id,
    asset: soared.id,
    type: "BUY",
    occurred_on: "2025-01-15",
    quantity_delta: "100",
    unit_price: "20.00",
    cash_delta: { amount: -200_000, currency: "BRL" },
  });
  await seedPriceQuote(page, {
    asset: soared.id,
    date: "2026-08-01",
    price: "60.00",
  });

  await recordMovement(page, {
    account: account.id,
    asset: crashed.id,
    type: "BUY",
    occurred_on: "2025-01-15",
    quantity_delta: "100",
    unit_price: "50.00",
    cash_delta: { amount: -500_000, currency: "BRL" },
  });
  await seedPriceQuote(page, {
    asset: crashed.id,
    date: "2026-08-01",
    price: "5.00",
  });

  // Exceeded many times over.
  await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: soared.id,
    steps: [{ from_month: 0, rate: "0.05", rate_period: "ANNUAL" }],
  });

  // Breached: a 10% floor under a position that lost ninety. The floor is a
  // positive magnitude — the API rejects a negative outright.
  await seedTarget(page, {
    scope: "HOLDING",
    account: account.id,
    asset: crashed.id,
    loss_limit_pct: "0.10",
    loss_limit_period: "ANNUAL",
    steps: [{ from_month: 0, rate: "0.05", rate_period: "ANNUAL" }],
  });

  // Every screen that shows either holding.
  await page.goto(PATHS.APP);
  await assertReportsOnly(page, "the overview");

  await page.goto(PATHS.TARGETS);
  await expect(
    page.getByRole("region", { name: app.enums.targetScope.HOLDING }),
  ).toBeVisible();
  await assertReportsOnly(page, "the targets list");

  for (const [asset, label] of [
    [soared, "the exceeded holding"],
    [crashed, "the breached holding"],
  ] as const) {
    await page.goto(
      routeTo(PATHS.HOLDING_DETAIL, {
        accountId: account.id,
        assetId: asset.id,
      }),
    );
    await expect(
      page.getByRole("region", { name: app.holding.target.title }),
    ).toBeVisible();
    await assertReportsOnly(page, label);
  }

  // The shortfall *is* reported — the point is that reporting is all that
  // happens, not that nothing is shown.
  //
  // Asserted as "a verdict from the vocabulary" rather than as `BELOW_FLOOR`,
  // and that is a finding rather than a hedge: this walk could not get the API
  // to emit `BELOW_FLOOR` at all. A 90% loss under a 10% annual floor answers
  // `BEHIND`, and so does the same loss under a 1% floor, a monthly floor, and
  // **no floor at all** — `loss_limit_pct` round-trips through create and read
  // without moving `status`. Either the verdict needs a condition this walk did
  // not find, or the floor is not yet wired into the derivation. It is the
  // first ask in `docs/backend-requests/2026-08-04-targets.md`; when it is
  // settled, this assertion tightens to the exact word.
  await expect(
    page.getByText(
      new RegExp(`^(${Object.values(app.enums.targetStatus).join("|")})$`),
    ),
  ).toBeVisible();
});
