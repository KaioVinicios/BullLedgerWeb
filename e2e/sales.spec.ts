import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { recordMovement, seedAccount, seedSecurity } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * The sales history screen, walked as a screen: reached from the sidebar,
 * filtered, reloaded, and expanded — not just rendered.
 *
 * Two lots are built so the filter step has something real to prove:
 *
 * - "Totvs" is bought and sold whole, in one movement, at a gain (200.00 in,
 *   240.00 out — +20%). No expander: one sale is nothing to open into.
 * - "Cielo" is bought once and sold in two tranches on two different dates,
 *   both at a loss (200.00 in, 75.00 then 80.00 out — -25% and -20%, -22.5%
 *   blended). This is the row `result=LOSS` must keep, and the one whose
 *   expander opens into both tranches.
 *
 * Filtering to losses must make the Totvs row disappear, not just change the
 * address bar — and the Cielo row has to survive a reload with the filter
 * still applied, which is the entire point of keeping it in the URL.
 */
test("reaches sales history from the sidebar, filters to losses, and expands a multi-sale lot", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const gainAsset = await seedSecurity(page, {
    name: "Totvs",
    ticker: "TOTS3",
  });
  const lossAsset = await seedSecurity(page, {
    name: "Cielo",
    ticker: "CIEL3",
  });

  await recordMovement(page, {
    account: account.id,
    type: "DEPOSIT",
    occurred_on: "2026-01-01",
    cash_delta: { amount: 100_000, currency: "BRL" },
  });

  // Totvs: bought and sold whole, in one movement, at a gain.
  const gainBuy = await recordMovement(page, {
    account: account.id,
    asset: gainAsset.id,
    type: "BUY",
    occurred_on: "2026-01-05",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: { amount: -20_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: account.id,
    asset: gainAsset.id,
    type: "SELL",
    occurred_on: "2026-02-01",
    quantity_delta: "-10",
    unit_price: "24.00",
    cash_delta: { amount: 24_000, currency: "BRL" },
    lot: gainBuy.lot,
  });

  // Cielo: bought once, sold across two tranches on two different dates,
  // both at a loss.
  const lossBuy = await recordMovement(page, {
    account: account.id,
    asset: lossAsset.id,
    type: "BUY",
    occurred_on: "2026-01-06",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: { amount: -20_000, currency: "BRL" },
  });

  await recordMovement(page, {
    account: account.id,
    asset: lossAsset.id,
    type: "SELL",
    occurred_on: "2026-03-10",
    quantity_delta: "-5",
    unit_price: "15.00",
    cash_delta: { amount: 7_500, currency: "BRL" },
    lot: lossBuy.lot,
  });

  await recordMovement(page, {
    account: account.id,
    asset: lossAsset.id,
    type: "SELL",
    occurred_on: "2026-03-20",
    quantity_delta: "-5",
    unit_price: "16.00",
    cash_delta: { amount: 8_000, currency: "BRL" },
    lot: lossBuy.lot,
  });

  // 1. Sign in, then reach the screen from the sidebar — not by URL.
  await page.goto(PATHS.APP);
  const nav = page.getByRole("navigation", { name: app.sidebar.label });
  await nav.getByRole("link", { name: app.nav.sales }).click();

  await expect(page).toHaveURL(PATHS.SALES);
  await expect(
    page.getByRole("heading", { level: 1, name: app.screens.sales.title }),
  ).toBeVisible();

  // 2. A known seeded row is visible: the whole-lot gain on Totvs.
  const gainRow = page.getByRole("row", { name: /Totvs/ });
  await expect(gainRow).toBeVisible();
  await expect(gainRow.getByText("+20%")).toBeVisible();

  const lossRow = page.getByRole("row", { name: /Cielo/ });
  await expect(lossRow).toBeVisible();

  // 3. Filter to losses: the URL gains result=LOSS, and the winning row —
  // visible a moment ago — is gone. Not merely a URL check: a filter that
  // repaints the address bar and nothing else is exactly the bug this
  // catches.
  await page.getByRole("combobox", { name: app.sales.filters.result }).click();
  await page.getByRole("option", { name: app.sales.result.LOSS }).click();

  await expect(page).toHaveURL(/result=LOSS/);
  await expect(page.getByRole("row", { name: /Totvs/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Cielo/ })).toBeVisible();

  // 4. Reload: the filter survives in the URL, and the table still reflects
  // it — the whole reason filters live there instead of in component state.
  await page.reload();

  await expect(page).toHaveURL(/result=LOSS/);
  await expect(page.getByRole("row", { name: /Totvs/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Cielo/ })).toBeVisible();

  // 5. Expand the two-tranche lot's row: both sale dates become visible.
  const toggle = page.getByRole("button", { name: app.sales.expand });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();

  await expect(
    page.getByRole("button", { name: app.sales.collapse }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText(app.sales.kind.SELL, { exact: true }),
  ).toHaveCount(2);
  // The first tranche's date appears only in its own sub-row.
  await expect(page.getByText("03/10/2026")).toBeVisible();
  // The second tranche's date matches twice on purpose: once on its own
  // sub-row, and once on the parent row, whose `sold_on` is the later of the
  // two. A count of 2 — not 1 — is what proves the sub-row actually rendered
  // rather than the parent's own date being mistaken for it.
  await expect(page.getByText("03/20/2026")).toHaveCount(2);
});
