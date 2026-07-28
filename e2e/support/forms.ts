import type { Page } from "@playwright/test";

import auth from "@/i18n/locales/en/auth.json" with { type: "json" };
import type { TestUser } from "./users";

/**
 * Filling in and submitting the two auth forms.
 *
 * Fields are addressed by their label and the button by its role, so these
 * survive a markup change and break — correctly — on a copy change. The
 * strings come from the English resources rather than being typed out here,
 * which is what keeps them the *same* strings the app renders.
 *
 * English, therefore: a spec running under another locale drives its form
 * itself, against that locale's resources.
 */

export async function submitRegisterForm(
  page: Page,
  user: TestUser,
): Promise<void> {
  await page.getByLabel(auth.fields.email).fill(user.email);
  await page
    .getByLabel(auth.fields.password, { exact: true })
    .fill(user.password);
  await page.getByLabel(auth.fields.passwordConfirm).fill(user.password);
  // The only checkbox on the screen, and the label around it is a sentence
  // with two links in it — the role is the stable handle.
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: auth.register.submit }).click();
}

export async function submitLoginForm(
  page: Page,
  user: TestUser,
  password = user.password,
): Promise<void> {
  await page.getByLabel(auth.fields.email).fill(user.email);
  await page.getByLabel(auth.fields.password, { exact: true }).fill(password);

  await page.getByRole("button", { name: auth.login.submit }).click();
}
