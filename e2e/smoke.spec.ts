import { expect, test } from "@playwright/test";

// Asserts structure rather than copy: every visible string is translated, so
// the test must pass in either locale.
test("the home page boots and renders a heading", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toBeVisible();
});
