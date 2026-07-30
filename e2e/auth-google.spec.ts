import app from "@/i18n/locales/en/app.json" with { type: "json" };
import auth from "@/i18n/locales/en/auth.json" with { type: "json" };
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { expect, test } from "./support/fixtures";
import { STUB_AUTHORIZATION_CODE, stubGoogleSdk } from "./support/google";
import { freshUser } from "./support/users";

/**
 * `user-flows.md` §1 — signing in with Google.
 *
 * **The one journey in this phase that is not end to end, and the reason is
 * not a shortcut.** Completing Google's consent screen needs a human, so the
 * real popup cannot run unattended at all. What runs here instead is the app's
 * entire client half — provider, hook, mutation, cache, navigation — against a
 * stub of the Google Identity Services script, with the API's answer stubbed
 * from the authorization code onward.
 *
 * So this proves the client forwards the code it was given and lands where an
 * email registrant lands. It does **not** prove the exchange, the
 * provisioning, or that a returning Google user avoids a duplicate account —
 * those are server behaviour, and they stay covered by BullLedgerAPI's own
 * tests. First-time and returning are indistinguishable from this side of the
 * boundary, which is why there is one test here and not two.
 *
 * See `docs/v1-e2e-todo.md`, Phase 2.
 */

const NOT_CONFIGURED =
  "VITE_GOOGLE_CLIENT_ID is unset, so the button does not exist — by design.";

test("forwards Google's authorization code and lands in the app", async ({
  page,
}) => {
  const user = freshUser();
  await stubGoogleSdk(page, "code");

  // The session begins when the exchange succeeds, so the "who am I" endpoint
  // answers differently before and after — otherwise the guard on /login would
  // bounce this page to /app before the flow ever started.
  let signedIn = false;
  await page.route(`**${ENDPOINTS.authUser}`, (route) =>
    signedIn
      ? route.fulfill({
          json: { pk: 1, email: user.email, first_name: "", last_name: "" },
        })
      : route.fulfill({ status: 401, json: { detail: "Unauthenticated." } }),
  );

  let postedCode: unknown;
  await page.route(`**${ENDPOINTS.authGoogle}`, async (route) => {
    postedCode = route.request().postDataJSON()?.code;
    signedIn = true;
    // The real endpoint answers with cookies and a body carrying no user, so
    // the app asks who arrived rather than assuming — which is the round trip
    // stubbed above.
    await route.fulfill({ status: 200, json: {} });
  });

  await page.goto(PATHS.LOGIN);
  // Counting is the one locator call that does not wait for anything, so the
  // screen has to be there before "the button is absent" can mean anything.
  await expect(
    page.getByRole("heading", { name: auth.login.title }),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: auth.google.continue });
  if ((await googleButton.count()) === 0) test.skip(true, NOT_CONFIGURED);

  await googleButton.click();

  await expect(page).toHaveURL(PATHS.APP);
  await expect(
    page.getByRole("heading", { name: app.screens.overview.title }),
  ).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();

  // Verbatim: the code means nothing until the backend redeems it, and it can
  // only redeem the one Google actually issued.
  expect(postedCode).toBe(STUB_AUTHORIZATION_CODE);
});

test("surfaces a declined consent screen as an ordinary form error", async ({
  page,
}) => {
  await stubGoogleSdk(page, "declined");

  await page.goto(PATHS.LOGIN);
  // Counting is the one locator call that does not wait for anything, so the
  // screen has to be there before "the button is absent" can mean anything.
  await expect(
    page.getByRole("heading", { name: auth.login.title }),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: auth.google.continue });
  if ((await googleButton.count()) === 0) test.skip(true, NOT_CONFIGURED);

  await googleButton.click();

  // Not a crash, not a toast, and not a silent nothing.
  await expect(page.locator('[data-slot="alert"]')).toHaveText(
    auth.google.failed,
  );
  await expect(page).toHaveURL(PATHS.LOGIN);
});
