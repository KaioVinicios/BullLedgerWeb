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
 * The same asset in two institutions, consolidated — and then broken back into
 * the two purchases that built it.
 *
 * This is the journey the custody pivot cannot answer. "Where is my Petrobras,
 * and how much of it do I have in total" needs the rows regrouped, and the
 * average cost only means anything because an asset has exactly one currency.
 *
 * The prices are chosen so the consolidated figure is neither of them: ten at
 * R$20 and fifteen at R$24 average to R$22,40. A screen that averaged the two
 * rates instead of the two positions would print R$22,00 and look right.
 */
test("consolidates one asset across institutions, then names each purchase", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const xp = await seedInstitution(page, { name: "XP Investimentos" });
  const nu = await seedInstitution(page, { name: "Nubank" });

  const broker = await seedAccount(page, {
    name: "XP Corretora",
    institution: xp.id,
  });
  const nuAccount = await seedAccount(page, {
    name: "Conta Nubank",
    institution: nu.id,
  });

  const petr = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  for (const account of [broker, nuAccount]) {
    await recordMovement(page, {
      account: account.id,
      type: "DEPOSIT",
      occurred_on: "2026-03-01",
      cash_delta: { amount: 100_000, currency: "BRL" },
    });
  }

  await recordMovement(page, {
    account: broker.id,
    asset: petr.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: { amount: -20_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: nuAccount.id,
    asset: petr.id,
    type: "BUY",
    occurred_on: "2026-03-11",
    quantity_delta: "15",
    unit_price: "24.00",
    cash_delta: { amount: -36_000, currency: "BRL" },
  });

  await seedPriceQuote(page, {
    asset: petr.id,
    date: "2026-03-25",
    price: "30.00",
  });

  await page.goto(`${PATHS.HOLDINGS}?by=asset`);

  const group = page.getByRole("region", { name: /Petrobras/ });
  await expect(group).toBeVisible();

  // Both custodians named under the one asset — the answer the custody pivot
  // splits across two blocks.
  await expect(group.getByText(/XP Corretora/)).toBeVisible();
  await expect(group.getByText(/Conta Nubank/)).toBeVisible();

  // 25 units on a R$560,00 basis is R$22,40 each: neither price paid.
  await expect(group.getByText("R$22.40")).toBeVisible();

  await page.goto(`${PATHS.HOLDINGS}?by=asset&grain=instance`);

  // Each purchase keeps its own price, which the average is derived from and
  // does not replace.
  const instances = page.getByRole("region", { name: /Petrobras/ });
  await expect(instances.getByText("R$20.00")).toBeVisible();
  await expect(instances.getByText("R$24.00")).toBeVisible();
});
