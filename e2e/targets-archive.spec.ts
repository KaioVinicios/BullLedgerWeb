import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

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

const VERDICTS = Object.values(app.enums.targetStatus);

/**
 * `v1-e2e-todo.md` Phase 9 — archive a target.
 *
 * Two halves, and the second is the one that matters. Archival is soft: the
 * row leaves the list and comes back under "show archived", nothing is deleted.
 * Then the holding it covered **falls back to having no status rather than to a
 * stale one** — which is this phase's cache rule proved against a real server
 * instead of against a query client.
 *
 * That second half is worth an end-to-end run precisely because nothing would
 * look broken if it failed: a stale verdict is a plausible-looking word in the
 * right place, still being read as current.
 */
test("archives a target softly, and the holding it covered loses its status", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

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

  const holdingUrl = routeTo(PATHS.HOLDING_DETAIL, {
    accountId: account.id,
    assetId: asset.id,
  });

  // The status exists before the archive, so its absence afterwards is a
  // change rather than a thing that never worked.
  await page.goto(holdingUrl);
  await expect(
    page
      .getByRole("region", { name: app.holding.target.title })
      .getByText(new RegExp(`^(${VERDICTS.join("|")})$`)),
  ).toBeVisible();

  // ---- Archive it, through the shared dialog ----------------------------
  await page.goto(PATHS.TARGETS);

  const name = `${asset.name} · ${account.name}`;
  const holdings = page.getByRole("region", {
    name: app.enums.targetScope.HOLDING,
  });

  await page
    .getByRole("button", {
      name: app.structure.openMenu.replace("{{name}}", name),
    })
    .click();
  await page.getByRole("menuitem", { name: app.structure.archive }).click();

  await expect(
    page.getByText(app.structure.archiveDialog.title.replace("{{name}}", name)),
  ).toBeVisible();
  await page
    .getByRole("button", { name: app.structure.archiveDialog.confirm })
    .click();

  // Gone from the list…
  await expect(
    holdings.getByRole("row", { name: new RegExp(asset.name) }),
  ).toHaveCount(0);

  // …but not deleted: it returns under "show archived", labelled as archived.
  await page.getByRole("switch", { name: app.structure.showArchived }).click();

  const archivedRow = holdings.getByRole("row", {
    name: new RegExp(asset.name),
  });
  await expect(archivedRow).toBeVisible();
  await expect(
    archivedRow.getByText(app.structure.archivedBadge),
  ).toBeVisible();

  // ---- The half that matters --------------------------------------------
  await page.goto(holdingUrl);

  const block = page.getByRole("region", { name: app.holding.target.title });
  await expect(block.getByText(app.holding.target.none)).toBeVisible();

  // Not a stale verdict left behind by a cache nobody swept.
  for (const verdict of VERDICTS) {
    await expect(block.getByText(verdict, { exact: true })).toHaveCount(0);
  }

  // Same on the overview: the status cell is empty, not holding yesterday's
  // answer.
  await page.goto(PATHS.APP);
  await expect(
    page
      .getByRole("row", { name: new RegExp(asset.name) })
      .getByRole("cell")
      .last(),
  ).toBeEmpty();
});
