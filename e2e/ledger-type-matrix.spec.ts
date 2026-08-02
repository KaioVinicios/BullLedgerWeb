import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  seedAccount,
  seedCrypto,
  seedFund,
  seedSavings,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 6 — never be offered an invalid archetype/type
 * combination.
 *
 * The assertion is against the **live** `GET /api/movement-types/`, which is
 * what makes this journey worth running in a browser at all: the component
 * tests check the same rule against a captured fixture, and only this one can
 * fail when the server's table changes.
 */
test("offers each archetype exactly its own column of the matrix", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const security = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });
  const savings = await seedSavings(page, { name: "Poupança" });
  const fund = await seedFund(page, { name: "Fundo Multimercado" });
  const crypto = await seedCrypto(page, { name: "Bitcoin", symbol: "BTC" });

  await page.goto(PATHS.LEDGER_NEW);
  await page.getByRole("combobox", { name: app.ledger.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();

  const chooseAsset = async (name: string) => {
    await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
    await page.getByRole("option", { name, exact: true }).click();
    await page.getByRole("combobox", { name: app.ledger.form.type }).click();
  };

  const offered = () => page.getByRole("option");
  const close = () => page.keyboard.press("Escape");

  await chooseAsset(security.name);
  await expect(
    offered().filter({ hasText: app.enums.movementType.BUY }),
  ).toHaveCount(1);
  await expect(
    offered().filter({ hasText: app.enums.movementType.SPLIT }),
  ).toHaveCount(1);
  await expect(
    offered().filter({ hasText: app.enums.movementType.COUPON }),
  ).toHaveCount(0);
  await close();

  // A savings account pays interest; it does not pay dividends.
  await chooseAsset(savings.name);
  await expect(
    offered().filter({ hasText: app.enums.movementType.INTEREST }),
  ).toHaveCount(1);
  await expect(
    offered().filter({ hasText: app.enums.movementType.DIVIDEND }),
  ).toHaveCount(0);
  await close();

  // A fund's units are not split by a corporate action.
  await chooseAsset(fund.name);
  await expect(
    offered().filter({ hasText: app.enums.movementType.SELL }),
  ).toHaveCount(1);
  await expect(
    offered().filter({ hasText: app.enums.movementType.SPLIT }),
  ).toHaveCount(0);
  await close();

  await chooseAsset(crypto.name);
  await expect(
    offered().filter({ hasText: app.enums.movementType.DIVIDEND }),
  ).toHaveCount(0);
  // Transfers are a different endpoint and a different screen, everywhere.
  await expect(
    offered().filter({ hasText: app.enums.movementType.TRANSFER_OUT }),
  ).toHaveCount(0);
});
