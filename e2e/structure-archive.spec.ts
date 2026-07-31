import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createAccountUI, createInstitutionUI } from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";
import type { Page } from "@playwright/test";

/**
 * `v1-e2e-todo.md` Phase 5 — archive an institution, an account, and an
 * asset. The wording is archival, never deletion; the row leaves the default
 * list and returns only when archived rows are explicitly requested; nothing
 * is destroyed — proven by restoring one of them at the end.
 */

async function archiveRow(page: Page, name: string): Promise<void> {
  await page
    .getByRole("button", {
      name: app.structure.openMenu.replace("{{name}}", name),
    })
    .click();
  await page.getByRole("menuitem", { name: app.structure.archive }).click();

  const dialog = page.getByRole("alertdialog");
  // Archival wording, and the promise that history survives.
  await expect(
    dialog.getByText(app.structure.archiveDialog.description),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: app.structure.archiveDialog.confirm })
    .click();

  // Gone from the default view…
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
    0,
  );

  // …back on explicit request, marked in text.
  await page.getByRole("switch", { name: app.structure.showArchived }).click();
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row.getByText(app.structure.archivedBadge)).toBeVisible();
}

test("archives one of each resource, and restores one", async ({ page }) => {
  test.setTimeout(120_000);
  await createSignedInAccount(page, freshUser());

  await createInstitutionUI(page, { name: "Banco Velho", kinds: ["BANK"] });
  await createAccountUI(page, {
    name: "Conta antiga",
    country: "Brazil",
    registration: app.enums.registration.BR_TAXABLE,
    institution: "Banco Velho",
  });

  await page.goto(PATHS.ASSETS_NEW);
  await page
    .getByLabel(app.assets.form.name, { exact: true })
    .fill("Poupança antiga");
  await page.getByRole("button", { name: app.assets.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ASSETS}$`));

  // Asset first — it was just created and the list is already open.
  await archiveRow(page, "Poupança antiga");

  await page.goto(PATHS.ACCOUNTS);
  await archiveRow(page, "Conta antiga");

  await page.goto(PATHS.INSTITUTIONS);
  await archiveRow(page, "Banco Velho");

  // Nothing was destroyed: restore brings the institution back to the
  // default view, without a confirmation gate — restoring is safe.
  await page
    .getByRole("button", {
      name: app.structure.openMenu.replace("{{name}}", "Banco Velho"),
    })
    .click();
  await page.getByRole("menuitem", { name: app.structure.restore }).click();

  await page.getByRole("switch", { name: app.structure.showArchived }).click();
  const restored = page.getByRole("row", { name: /Banco Velho/ });
  await expect(restored).toBeVisible();
  await expect(restored.getByText(app.structure.archivedBadge)).toHaveCount(0);
});
