import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — filter the ledger.
 *
 * The filters are URL state, which is what makes the second half of this spec
 * possible: a reload has to come back to the same view, because a filtered
 * ledger is a thing people bookmark and send.
 */
test("filters by account, asset, and type, and survives a reload", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const brokerage = await seedAccount(page, { name: "Corretora" });
  const bank = await seedAccount(page, { name: "Banco" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await recordMovement(page, {
    account: brokerage.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });
  await recordMovement(page, {
    account: bank.id,
    type: "DEPOSIT",
    occurred_on: "2026-03-05",
    cash_delta: { amount: 50_000, currency: "BRL" },
  });

  await page.goto(PATHS.LEDGER);
  await expect(page.getByRole("row")).toHaveCount(3); // header + two rows

  await page
    .getByRole("combobox", { name: app.ledger.filters.account })
    .click();
  await page.getByRole("option", { name: bank.name, exact: true }).click();

  await expect(
    page.getByRole("row", { name: new RegExp(app.enums.movementType.DEPOSIT) }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(app.enums.movementType.BUY) }),
  ).toHaveCount(0);

  // The filter is in the address bar, so it is still there afterwards.
  await expect(page).toHaveURL(new RegExp(`account=${bank.id}`));
  await page.reload();
  await expect(
    page.getByRole("row", { name: new RegExp(app.enums.movementType.BUY) }),
  ).toHaveCount(0);

  // A date range that excludes everything says so, and offers the way back.
  await page
    .getByRole("textbox", { name: app.ledger.filters.from })
    .fill("2020-01-01");
  await page
    .getByRole("textbox", { name: app.ledger.filters.to })
    .fill("2020-12-31");
  await expect(page.getByText(app.ledger.noMatches.title)).toBeVisible();

  await page.getByRole("button", { name: app.ledger.noMatches.clear }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
});
