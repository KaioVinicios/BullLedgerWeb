import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  recordMovement,
  seedAccount,
  seedInstitution,
  seedPriceQuote,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * The holdings screen's custody pivot: what is inside each institution now.
 *
 * The assertion that carries it is the last one. Everything before it builds a
 * portfolio where one position was opened and closed and another is still
 * held, so that "what I hold" and "what I have ever held" give different
 * answers — and the screen has to give the first. Nothing else in the suite
 * would notice that difference, because every other screen is allowed to show
 * history.
 */
test("shows what each institution holds, and nothing it no longer holds", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const broker = await seedInstitution(page, { name: "XP Investimentos" });
  const account = await seedAccount(page, {
    name: "XP Corretora",
    institution: broker.id,
  });
  const held = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });
  const sold = await seedSecurity(page, { name: "Vale", ticker: "VALE3" });

  // Cash in before cash out, so the portfolio is one a person could have.
  await recordMovement(page, {
    account: account.id,
    type: "DEPOSIT",
    occurred_on: "2026-03-01",
    cash_delta: { amount: 100_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: account.id,
    asset: held.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: { amount: -20_000, currency: "BRL" },
  });

  const entry = await recordMovement(page, {
    account: account.id,
    asset: sold.id,
    type: "BUY",
    occurred_on: "2026-03-05",
    quantity_delta: "5",
    unit_price: "10.00",
    cash_delta: { amount: -5_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: account.id,
    asset: sold.id,
    type: "SELL",
    occurred_on: "2026-03-20",
    quantity_delta: "-5",
    unit_price: "12.00",
    cash_delta: { amount: 6_000, currency: "BRL" },
    lot: entry.lot,
  });

  await seedPriceQuote(page, {
    asset: held.id,
    date: "2026-03-25",
    price: "22.00",
  });

  await page.goto(PATHS.HOLDINGS);

  // One account under this institution, so the two headers merge into one row
  // rather than printing the broker's name above a single child.
  const group = page.getByRole("region", {
    name: /XP Investimentos · XP Corretora/,
  });
  await expect(group).toBeVisible();
  await expect(group.getByText("Petrobras")).toBeVisible();
  await expect(group.getByText(app.holdings.cash)).toBeVisible();

  // The ledger still has the Vale round trip; this screen is not the ledger.
  await expect(page.getByText("Vale")).toHaveCount(0);
});
