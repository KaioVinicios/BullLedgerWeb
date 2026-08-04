import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { CSRF_COOKIE, CSRF_HEADER, CSRF_PATH } from "@/lib/csrf";
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { apiUrl } from "./support/config";
import { expect, test } from "./support/fixtures";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 7 — the FX table reads and never writes.
 *
 * This replaced "override an FX rate", and the first assertion here is why:
 * against the real API, a normal user's attempt to write the table is refused.
 * The screen's read-only shape is not a scope cut, it is the only honest
 * rendering of a permission the client cannot even detect.
 */
test("reads the global rate table and offers no way to write it", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  // The premise, proven against the running API rather than quoted from the
  // schema: this user cannot write the table. `is_staff` is exposed nowhere,
  // so the client could not have known in advance either.
  await page.request.get(apiUrl(CSRF_PATH));
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value;
  const refused = await page.request.post(apiUrl(ENDPOINTS.fxRates), {
    data: { base: "BRL", quote: "USD", date: "2026-08-02", rate: "0.18" },
    headers: { [CSRF_HEADER]: token ?? "" },
    failOnStatusCode: false,
  });
  expect(refused.status()).toBe(403);

  await page.goto(PATHS.PRICING_FX);

  // What the screen does instead of offering the write: explain which rate
  // wins, and point at the override the user actually has.
  await expect(page.getByText(app.pricing.fx.precedence)).toBeVisible();
  await expect(page.getByText(app.pricing.fx.movementOverride)).toBeVisible();
  await expect(page.getByText(app.pricing.fx.readOnly)).toBeVisible();

  // No write affordance anywhere on the screen. Scoped to `main`, because the
  // shell's footer links warn "(opens in a new tab)".
  const main = page.getByRole("main");
  await expect(
    main.getByRole("button", { name: /record|add|new|save|create/i }),
  ).toHaveCount(0);
  await expect(
    main.getByRole("link", { name: /record|add|new|create/i }),
  ).toHaveCount(0);
  await expect(main.getByRole("textbox")).toHaveCount(0);

  // The table is global, so a fresh user sees whatever the feed has published.
  // Either it has rows, in which case each names its source in words, or it is
  // empty and says so — both are correct, and neither is a blank screen.
  const rows = main.getByRole("row");
  const count = await rows.count();

  if (count > 1) {
    const sources = main.getByText(
      new RegExp(
        `^(${app.enums.priceSource.MANUAL}|${app.enums.priceSource.FEED})$`,
      ),
    );
    expect(await sources.count()).toBeGreaterThan(0);
  } else {
    // Unfiltered, so an empty table means the platform's sync has not
    // published — not that the reader filtered themselves out of the rows.
    await expect(
      page.getByText(app.pricing.fx.empty.unfilteredTitle),
    ).toBeVisible();
  }
});
