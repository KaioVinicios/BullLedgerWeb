import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  recordMovement,
  seedAccount,
  seedPriceQuote,
  seedSecurity,
  voidMovement,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 8 — record a movement and watch the figures move,
 * then void it and watch them move back.
 *
 * This is the journey the whole phase exists to make possible, and the one
 * only E2E can prove: the *server's* computation is the thing under test.
 * MSW can assert that a cache key was invalidated; only a real API can show
 * that the number it recomputes afterwards is different.
 *
 * The two halves live in one spec because the second needs the first's
 * movement, and re-recording it would test the same write twice.
 */
test("moves the overview when a movement is recorded, and back when it is voided", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const asset = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await page.goto(PATHS.APP);

  // Nothing recorded yet, so the first-run surface owns the screen.
  await expect(
    page.getByRole("heading", { name: app.overview.firstRun.title }),
  ).toBeVisible();

  const movement = await recordMovement(page, {
    account: account.id,
    asset: asset.id,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "19.40",
    cash_delta: { amount: -19_400, currency: "BRL" },
  });

  // A price, so the position can be valued at all — without one the server
  // reports it under `missing` and the total stays short of it.
  await seedPriceQuote(page, {
    asset: asset.id,
    date: "2026-03-05",
    price: "25.00",
  });

  await page.reload();

  // The figures exist now, and the first-run surface has stood down.
  await expect(
    page.getByRole("heading", { name: app.overview.firstRun.title }),
  ).toHaveCount(0);

  const group = page.getByRole("region", { name: account.name });
  await expect(group).toBeVisible();

  // The holding is there, and it is the way into its own detail.
  const holdingLink = group.getByRole("link", { name: asset.name });
  await expect(holdingLink).toBeVisible();
  await expect(holdingLink).toHaveAttribute(
    "href",
    `${PATHS.APP}/holdings/${account.id}/${asset.id}`,
  );

  // 10 units at 25.00 = 250.00, computed by the server and read here. Never
  // parsed back into a number — the string the API produced, formatted the way
  // the app formats it.
  await expect(group.getByText("R$250.00")).toBeVisible();

  // --- void it, and watch the projection let go of it ---

  await voidMovement(page, movement.id);

  await page.goto(PATHS.APP);

  // The position is gone from the projection...
  await expect(page.getByText("R$250.00")).toHaveCount(0);

  // ...while the movement itself survives, reachable under include-voided.
  // Nothing was destroyed — that is the whole point of voiding over deleting.
  await page.goto(`${PATHS.LEDGER}?include_voided=true`);
  await expect(page.getByText(app.ledger.voidedBadge).first()).toBeVisible();
});
