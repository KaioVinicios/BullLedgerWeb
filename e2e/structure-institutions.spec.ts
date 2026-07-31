import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createInstitutionUI } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `v1-e2e-todo.md` Phase 5 — register an institution.
 *
 * The multi-select is the point: `kinds` is a set, an institution is
 * routinely both a bank and a brokerage, and the row must carry every kind
 * chosen rather than silently collapsing to one.
 */
test("registers an institution carrying every kind chosen", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());

  await createInstitutionUI(page, {
    name: "XP Investimentos",
    kinds: ["BANK", "BROKERAGE", "PENSION_PROVIDER"],
  });

  const row = page.getByRole("row", { name: /XP Investimentos/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(app.enums.kind.BANK)).toBeVisible();
  await expect(row.getByText(app.enums.kind.BROKERAGE)).toBeVisible();
  await expect(row.getByText(app.enums.kind.PENSION_PROVIDER)).toBeVisible();

  // The list survives a reload from the URL alone.
  await page.goto(PATHS.INSTITUTIONS);
  await expect(
    page.getByRole("row", { name: /XP Investimentos/ }),
  ).toBeVisible();
});
