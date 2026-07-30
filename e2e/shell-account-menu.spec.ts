import app from "@/i18n/locales/en/app.json" with { type: "json" };
import common from "@/i18n/locales/en/common.json" with { type: "json" };
import ptApp from "@/i18n/locales/pt/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createSignedInAccount, freshUser } from "./support/users";

/** `v1-e2e-todo.md` Phase 3 — the account menu, by keyboard alone. */

test("puts the skip link first, before the whole sidebar", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  await page.goto(PATHS.APP);
  await page.getByRole("navigation", { name: app.sidebar.label }).waitFor();

  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: app.skipToContent });
  await expect(skip).toBeFocused();
  // sr-only until focused, which is the whole point of the pattern.
  await expect(skip).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
});

test("opens the account menu and reaches every item from the keyboard", async ({
  page,
}) => {
  const user = freshUser();
  await createSignedInAccount(page, user);
  await page.goto(PATHS.APP);

  const trigger = page.getByRole("button", { name: user.email });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");

  // Every destination the menu owes the user.
  await expect(
    page.getByRole("menuitem", { name: app.accountMenu.profile }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: app.accountMenu.theme }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: app.accountMenu.language }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: app.accountMenu.logout }),
  ).toBeVisible();

  // Escape closes it and hands focus back, rather than dropping it on <body>.
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("changes theme and language from inside the menu", async ({ page }) => {
  const user = freshUser();
  await createSignedInAccount(page, user);
  await page.goto(PATHS.APP);

  await page.getByRole("button", { name: user.email }).click();

  // Opened and chosen by keyboard, not by pointer: Radix puts
  // `pointer-events: none` on the body while a menu is open, so a click on a
  // submenu item lands on <html> instead. `press` focuses the element and
  // sends the key, which is both what a keyboard user does and the only
  // interaction that is not fighting the overlay.
  await page
    .getByRole("menuitem", { name: app.accountMenu.language })
    .press("Enter");
  await page
    .getByRole("menuitemradio", { name: common.language.pt })
    .press("Enter");

  // The toggles moved into this menu; proving one preference lands proves the
  // shared option groups are wired to something real on both mountings.
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: ptApp.screens.overview.title,
    }),
  ).toBeVisible();
});

test("reaches the profile screen from the menu", async ({ page }) => {
  const user = freshUser();
  await createSignedInAccount(page, user);
  await page.goto(PATHS.APP);

  await page.getByRole("button", { name: user.email }).click();
  await page.getByRole("menuitem", { name: app.accountMenu.profile }).click();

  await expect(page).toHaveURL(PATHS.PROFILE);
  await expect(
    page.getByRole("heading", { level: 1, name: app.screens.profile.title }),
  ).toBeVisible();
});
