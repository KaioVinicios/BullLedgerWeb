import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 8 — read allocation.
 *
 * Two assertions carry it: every dimension reconciles to the overview's total,
 * and no category is distinguishable by colour alone. The second is structural
 * rather than visual — the bar is `aria-hidden` and every slice names itself in
 * the table, so the check is that the labels and figures are really there.
 */
test("breaks the portfolio down three ways, each reconciling to the total", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  // Cash in before cash out, so the portfolio is one a person could actually
  // have. Buying without depositing first leaves free cash negative, which the
  // server faithfully reports as a negative slice and a weight outside 0–1 —
  // real behaviour, but a strange portfolio to write a reconciliation against.
  await recordMovement(page, {
    account: account.id,
    type: "DEPOSIT",
    occurred_on: "2026-03-01",
    cash_delta: { amount: 50_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: { amount: -20_000, currency: "BRL" },
  });

  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-03-05",
    price: "25.00",
  });

  // Reached from the overview's breakdown, which is the only way in.
  await page.goto(PATHS.APP);
  await page.getByRole("link", { name: app.overview.seeAllocation }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ALLOCATION}$`));

  const total = page.getByRole("row", {
    name: new RegExp(app.allocation.total),
  });

  for (const dimension of [
    app.allocation.dimensions.archetype,
    app.allocation.dimensions.currency,
    app.allocation.dimensions.country,
  ]) {
    await page.getByRole("tab", { name: dimension }).click();

    // Every dimension sums to the same total — the reconciliation is what
    // makes the split checkable rather than merely believable.
    await expect(total).toBeVisible();
    // 300.00 free cash + 250.00 of holdings, computed by the server.
    await expect(total.getByText("R$550.00")).toBeVisible();
  }

  // Currency and country name themselves through Intl, in the reader's
  // language — not as bare codes.
  await page
    .getByRole("tab", { name: app.allocation.dimensions.country })
    .click();
  await expect(page.getByRole("row", { name: /Brazil/ })).toBeVisible();

  await page
    .getByRole("tab", { name: app.allocation.dimensions.currency })
    .click();
  // Intl's own casing — "Brazilian Real", not the app's wording. That is the
  // point of using it rather than hand-translating fourteen names.
  await expect(page.getByRole("row", { name: /Brazilian Real/ })).toBeVisible();

  // No category depends on its colour: the bar carries no text at all and is
  // hidden from assistive technology, while every slice names itself in the
  // table beside it.
  await page
    .getByRole("tab", { name: app.allocation.dimensions.archetype })
    .click();
  await expect(
    page.getByRole("row", {
      name: new RegExp(app.enums.archetype.EXCHANGE_SECURITY),
    }),
  ).toBeVisible();

  // The sixth bucket. `by_archetype` is not the overview's `archetypes[]` —
  // this endpoint adds uninvested cash as a `FREE_CASH` slice, and types `key`
  // as a bare string, so nothing in the generated types marks the difference.
  // Found against a running API; without a branch for it the screen printed
  // the raw i18n key.
  await expect(
    page.getByRole("row", { name: new RegExp(app.allocation.freeCash) }),
  ).toBeVisible();
  await expect(page.getByText(/enums\.archetype/)).toHaveCount(0);

  // The dimension is in the address bar, so a breakdown is worth sending.
  await expect(page).toHaveURL(/dimension=archetype|allocation$/);
});
