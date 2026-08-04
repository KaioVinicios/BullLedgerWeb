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
 * `v1-e2e-todo.md` Phase 8 — confirm every projection surface is read-only.
 *
 * The one negative requirement in the phase, and the only kind of requirement
 * that rots silently: nothing fails when a write affordance appears on a
 * derived figure, it just quietly starts telling the user something the API
 * cannot honour. `business-rules.md` is unambiguous — balances, positions,
 * basis, and gains are never stored and there is no endpoint to set one — so
 * this sweep is what keeps the interface agreeing with that.
 *
 * Scoped to the content region throughout: the shell's own chrome (sidebar,
 * account menu, theme toggle) is not a projection's affordance.
 */

/** Words that would announce a write. Matched against accessible names. */
const WRITE_AFFORDANCE = /new|add|edit|record|save|delete|remove|void|archive/i;

test("offers no way to write on any projection surface", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

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

  const surfaces = [
    PATHS.APP,
    PATHS.ALLOCATION,
    `${PATHS.APP}/holdings/${account.id}/${asset.id}`,
    `${PATHS.LEDGER_LOTS}?account=${account.id}&asset=${asset.id}`,
    PATHS.ACCOUNTS_LIMITS,
  ];

  for (const surface of surfaces) {
    await page.goto(surface);

    const main = page.getByRole("main");
    await expect(main).toBeVisible();

    // Every control the screen itself offers, by accessible name.
    const names = await main
      .getByRole("button")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? ""),
      );
    const linkNames = await main
      .getByRole("link")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? ""),
      );

    for (const name of [...names, ...linkNames]) {
      expect(
        WRITE_AFFORDANCE.test(name),
        `"${name}" on ${surface} reads as a write affordance`,
      ).toBe(false);
    }

    // No form, and nothing typeable: an inline-edit cell would slip past a
    // name check but not this.
    await expect(main.locator("form")).toHaveCount(0);
    await expect(main.locator("input, textarea, select")).toHaveCount(0);
  }
});

test("names the limits table as reference rather than as something to edit", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  await page.goto(PATHS.ACCOUNTS_LIMITS);

  await expect(page.getByText(app.limits.reference)).toBeVisible();

  // Reached from the resource whose registration it qualifies, not from the
  // sidebar — reference data is not a peer of the ledger.
  await page.goto(PATHS.ACCOUNTS);
  await page.getByRole("link", { name: app.accounts.seeLimits }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ACCOUNTS_LIMITS}$`));
});
