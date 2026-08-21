import app from "@/i18n/locales/en/app.json" with { type: "json" };
import explain from "@/i18n/locales/en/explain.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import {
  accountName,
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * The overview's tabs and its analytics blocks, against a real API.
 *
 * The scope lives in the URL, so the checks that matter are the ones a unit
 * test cannot make: that the address bar carries the tab, that a reload lands
 * back on it, and that the browser's own back button walks the tabs. Each is
 * the URL contract rather than the component's state.
 *
 * One portfolio, seeded once and shared by every test in the file through a
 * signed-in page per test — the reads here are all projections, so nothing a
 * test does can change what another sees.
 */
async function seedPortfolio(page: Page) {
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  // Deposit before buying, so free cash never goes negative and the figures
  // describe a portfolio a person could actually hold.
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
    date: "2026-03-31",
    price: "22.00",
  });

  return { account, asset };
}

test("moves between the general and account scopes through the URL", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const { account } = await seedPortfolio(page);

  await page.goto(PATHS.APP);

  const general = page.getByRole("tab", { name: app.overview.tabs.general });
  await expect(general).toHaveAttribute("data-state", "active");
  await expect(page).not.toHaveURL(/account=/);

  await page.getByRole("tab", { name: accountName(account) }).click();
  await expect(page).toHaveURL(/account=/);

  // General is absence, not a value: returning drops the parameter entirely.
  await general.click();
  await expect(page).not.toHaveURL(/account=/);
});

test("keeps the scope across a reload, and across the back button", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const { account } = await seedPortfolio(page);

  await page.goto(PATHS.APP);
  await page.getByRole("tab", { name: accountName(account) }).click();
  await expect(page).toHaveURL(/account=/);
  const scoped = page.url();

  await page.reload();
  await expect(page).toHaveURL(scoped);
  await expect(
    page.getByRole("tab", { name: accountName(account) }),
  ).toHaveAttribute("data-state", "active");

  // The tab is history, so the browser's own control walks it.
  await page.goBack();
  await expect(page).not.toHaveURL(/account=/);
  await expect(
    page.getByRole("tab", { name: app.overview.tabs.general }),
  ).toHaveAttribute("data-state", "active");
});

test("renders the monthly table beside the chart, and the split by asset", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  await seedPortfolio(page);

  await page.goto(PATHS.APP);

  // The chart is decorative; these tables are where the figures actually are.
  await expect(
    page.getByRole("table", { name: app.overview.evolution.tableLabel }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: app.overview.byAsset.tableLabel }),
  ).toBeVisible();

  // Free cash is a row with a null asset, and must read as a label rather than
  // as the raw key Phase 8 shipped on the archetype dimension.
  await expect(
    page
      .getByRole("table", { name: app.overview.byAsset.tableLabel })
      .getByText(app.overview.byAsset.freeCash),
  ).toBeVisible();
});

test("says a portfolio with no sale is not ranked, rather than showing an empty list", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  await seedPortfolio(page);

  await page.goto(PATHS.APP);

  // Nothing above was ever sold, so the realized ranking has nothing to rank.
  await expect(page.getByText(app.overview.ranking.empty)).toBeVisible();
});

test("opens an explainer beside a figure and dismisses it with the keyboard", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  await seedPortfolio(page);

  await page.goto(PATHS.APP);

  // The one thing a unit test cannot make: that a real browser gives focus to
  // the popover, takes Escape, and hands focus back to where it came from.
  const trigger = page.getByRole("button", {
    name: `What is ${explain.portfolio.real_return.label.toLocaleLowerCase()}?`,
  });
  await trigger.click();

  const body = page.getByText(explain.portfolio.real_return.body);
  await expect(body).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(body).toBeHidden();
  await expect(trigger).toBeFocused();
});
