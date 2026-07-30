import app from "@/i18n/locales/en/app.json" with { type: "json" };
import errors from "@/i18n/locales/en/errors.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { submitLoginForm } from "./support/forms";
import { sessionCookies } from "./support/session";
import { createAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — signing back in. */

test("signs in with email and password", async ({ page, request }) => {
  const user = freshUser();
  // Created out of band, so this browser has never held a session — which is
  // the state signing out leaves behind, and the state this journey starts in.
  await createAccount(request, user);

  await page.goto(PATHS.LOGIN);

  // Recorded from here on, after the login screen's own document has loaded:
  // reaching /app is a client-side transition, and a full reload would mean
  // the router lost the session and let the browser start over.
  const documentRequests: string[] = [];
  page.on("request", (sent) => {
    if (sent.resourceType() === "document") documentRequests.push(sent.url());
  });

  await submitLoginForm(page, user);

  await expect(page).toHaveURL(PATHS.APP);
  await expect(
    page.getByRole("heading", { name: app.screens.overview.title }),
  ).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  expect(documentRequests).toEqual([]);
});

test("refuses a wrong password without starting a session", async ({
  page,
  context,
  request,
}) => {
  const user = freshUser();
  await createAccount(request, user);

  await page.goto(PATHS.LOGIN);
  await submitLoginForm(page, user, "not-the-right-password");

  await expect(page).toHaveURL(PATHS.LOGIN);

  // "Incorrect email or password" belongs to neither input — naming one would
  // tell an attacker which half was right.
  await expect(page.locator('[data-slot="alert"]')).toHaveText(
    errors.loginFailed,
  );
  await expect(page.locator("#email-error")).toHaveCount(0);
  await expect(page.locator("#password-error")).toHaveCount(0);

  const { access, refresh } = await sessionCookies(context);
  expect(access).toBeUndefined();
  expect(refresh).toBeUndefined();
});
