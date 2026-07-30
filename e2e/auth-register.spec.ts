import app from "@/i18n/locales/en/app.json" with { type: "json" };
import auth from "@/i18n/locales/en/auth.json" with { type: "json" };
import errors from "@/i18n/locales/en/errors.json" with { type: "json" };
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { apiUrl } from "./support/config";
import { expect, test } from "./support/fixtures";
import { submitRegisterForm } from "./support/forms";
import { emailedLinks, waitForEmailedLink } from "./support/mailbox";
import { SESSION_LEFTOVER_COOKIES, sessionCookies } from "./support/session";
import { createAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — signing up. */

test("registers with email and password, and arrives signed in", async ({
  page,
  context,
}) => {
  const user = freshUser();

  await page.goto(PATHS.REGISTER);
  await submitRegisterForm(page, user);

  await expect(page).toHaveURL(PATHS.APP);
  await expect(
    page.getByRole("heading", { name: app.screens.overview.title }),
  ).toBeVisible();

  // The screen showing the address is the app's claim; this is the server
  // agreeing. `page.request` rides the browser's own cookies, so a 200 here
  // proves the session works for a request the app itself would make.
  const whoAmI = await page.request.get(apiUrl(ENDPOINTS.authUser));
  expect(whoAmI.status()).toBe(200);
  expect(await whoAmI.json()).toMatchObject({ email: user.email });

  const { access, refresh, names } = await sessionCookies(context);

  // The whole point of the design: the tokens exist and JavaScript cannot
  // read them. Only a real browser can prove the second half.
  expect(access?.httpOnly).toBe(true);
  expect(refresh?.httpOnly).toBe(true);

  // allauth's session machinery would leave these behind if the API were
  // serving HTML. It is not, and the adapter suppresses the flash messages
  // that produce `messages` — a regression there is invisible in the UI.
  expect(names).not.toContain(SESSION_LEFTOVER_COOKIES[0]);
  expect(names).not.toContain(SESSION_LEFTOVER_COOKIES[1]);
});

test("refuses a second account for an address that already exists", async ({
  page,
  context,
  request,
}) => {
  const user = freshUser();
  await createAccount(request, user);

  // Registration mails a verification link, so the mailbox is where a second
  // account would show up. Waiting for the first one is what makes the count
  // below a fact rather than a race.
  await waitForEmailedLink({ to: user.email, kind: "verify-email" });

  await page.goto(PATHS.REGISTER);
  await submitRegisterForm(page, user);

  await expect(page).toHaveURL(PATHS.REGISTER);

  // The message belongs to the address the user typed, so it has to land on
  // that input — a banner would leave them hunting for which field to fix.
  const email = page.getByLabel(auth.fields.email);
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#email-error")).toHaveText(errors.emailTaken);
  await expect(page.locator('[data-slot="alert"]')).toHaveCount(0);

  // Nothing was created: a second account would have mailed a second link,
  // and a successful registration would have signed this browser in.
  expect(emailedLinks(user.email, "verify-email")).toHaveLength(1);
  const { access, refresh } = await sessionCookies(context);
  expect(access).toBeUndefined();
  expect(refresh).toBeUndefined();
});
