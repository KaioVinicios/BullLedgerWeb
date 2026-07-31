import { expect, type Page } from "@playwright/test";

import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

/**
 * Builds portfolio structure through the real UI — the decision recorded in
 * `v1-e2e-todo.md`'s open questions: the Phase 5 specs create structure
 * through the forms once, and later phases seed via the API instead. These
 * helpers assume the English locale the shared fixture pins.
 */

export async function createInstitutionUI(
  page: Page,
  options: {
    name: string;
    kinds: Array<keyof typeof app.enums.kind>;
    selfCustody?: boolean;
  },
): Promise<void> {
  await page.goto(PATHS.INSTITUTIONS_NEW);
  await page.getByLabel(app.institutions.form.name).fill(options.name);

  for (const kind of options.kinds) {
    await page.getByRole("checkbox", { name: app.enums.kind[kind] }).check();
  }

  if (options.selfCustody) {
    await page
      .getByRole("switch", { name: app.institutions.form.selfCustody })
      .click();
  }

  await page
    .getByRole("button", { name: app.institutions.form.create })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.INSTITUTIONS}$`));
}

export async function createAccountUI(
  page: Page,
  options: {
    name: string;
    country: "Brazil" | "United States" | "Canada";
    registration: string;
    institution?: string;
  },
): Promise<void> {
  await page.goto(PATHS.ACCOUNTS_NEW);
  await page.getByLabel(app.accounts.form.name).fill(options.name);
  await page.getByRole("radio", { name: options.country, exact: true }).click();
  await page.getByRole("radio", { name: options.registration }).click();

  if (options.institution) {
    await page
      .getByRole("combobox", { name: app.accounts.form.institution })
      .click();
    await page.getByRole("option", { name: options.institution }).click();
  }

  await page.getByRole("button", { name: app.accounts.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ACCOUNTS}$`));
}
