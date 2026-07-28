import enAuth from "@/i18n/locales/en/auth.json" with { type: "json" };
import enErrors from "@/i18n/locales/en/errors.json" with { type: "json" };
import ptAuth from "@/i18n/locales/pt/auth.json" with { type: "json" };
import ptErrors from "@/i18n/locales/pt/errors.json" with { type: "json" };
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { postAnonymously } from "./support/api";
import { expect, test } from "./support/fixtures";
import { submitLoginForm } from "./support/forms";
import { waitForEmailedLink } from "./support/mailbox";
import { createAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — getting back in without the password. */

const NEW_PASSWORD = "Tempestade-77-Barlavento";

test("recovers a forgotten password, and retires the old one", async ({
  page,
  request,
  baseURL,
}) => {
  const user = freshUser();
  const stranger = freshUser();
  await createAccount(request, user);

  // Asked twice, once for an address that exists and once for one that does
  // not. Comparing the two answers is the only way to prove the form is not an
  // account-enumeration oracle — a single confirmation proves nothing, since
  // it is the *difference* that would leak.
  await page.goto(PATHS.RESET_PASSWORD);
  await page.getByLabel(enAuth.fields.email).fill(stranger.email);
  await page.locator('button[type="submit"]').click();
  const confirmation = page.getByText(enAuth.resetRequest.sentBody);
  await expect(confirmation).toBeVisible();
  const answerForAStranger = await confirmation.textContent();

  await page.goto(PATHS.RESET_PASSWORD);
  await page.getByLabel(enAuth.fields.email).fill(user.email);
  await page.locator('button[type="submit"]').click();
  await expect(confirmation).toBeVisible();
  expect(await confirmation.textContent()).toBe(answerForAStranger);

  const link = await waitForEmailedLink({
    to: user.email,
    kind: "reset-password",
  });
  expect(link.origin).toBe(baseURL);

  await page.goto(link.pathname);
  await expect(
    page.getByRole("heading", { name: enAuth.resetConfirm.title }),
  ).toBeVisible();

  // Removed 2026-07-28: a "Send a new link" control borrowed from the
  // verification screen, which on this form would have mailed a *verification*
  // link to someone trying to reset a password.
  await expect(
    page.getByRole("link", { name: enAuth.verifyEmail.requestNew }),
  ).toHaveCount(0);

  await page
    .getByLabel(enAuth.fields.password, { exact: true })
    .fill(NEW_PASSWORD);
  await page.getByLabel(enAuth.fields.passwordConfirm).fill(NEW_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await expect(
    page.getByRole("heading", { name: enAuth.resetConfirm.successTitle }),
  ).toBeVisible();

  // A reset that leaves the old password working is not a reset.
  await page.goto(PATHS.LOGIN);
  await submitLoginForm(page, user, user.password);
  await expect(page.locator('[data-slot="alert"]')).toHaveText(
    enErrors.loginFailed,
  );

  await submitLoginForm(page, user, NEW_PASSWORD);
  await expect(page).toHaveURL(PATHS.APP);
});

test.describe("in Portuguese", () => {
  // Pinned, because the point of this journey is that the *server's* English
  // never reaches the screen.
  test.use({ language: "pt" });

  test("explains a reset link that was already spent", async ({
    page,
    request,
  }) => {
    const user = freshUser();
    await createAccount(request, user);

    // Requested through the API: the request form has its own coverage above,
    // and what is under test here starts at the link.
    await postAnonymously(ENDPOINTS.authPasswordReset, { email: user.email });

    const link = await waitForEmailedLink({
      to: user.email,
      kind: "reset-password",
    });

    await page.goto(link.pathname);
    await page
      .getByLabel(ptAuth.fields.password, { exact: true })
      .fill(NEW_PASSWORD);
    await page.getByLabel(ptAuth.fields.passwordConfirm).fill(NEW_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByRole("heading", { name: ptAuth.resetConfirm.successTitle }),
    ).toBeVisible();

    // Single-use by construction: changing the password changes the token
    // hash, so the same link cannot be spent twice.
    await page.goto(link.pathname);
    await page
      .getByLabel(ptAuth.fields.password, { exact: true })
      .fill(`${NEW_PASSWORD}-outra`);
    await page
      .getByLabel(ptAuth.fields.passwordConfirm)
      .fill(`${NEW_PASSWORD}-outra`);
    await page.locator('button[type="submit"]').click();

    // `token` and `uid` came from the link, not from an input the user can
    // see, so the message is lifted into the banner rather than left keyed to
    // a field where it would render nowhere. And it is in the active language:
    // the API answers in English by design, and translating it is the client's
    // job alone.
    await expect(page.locator('[data-slot="alert"]')).toHaveText(
      ptErrors.resetLinkInvalid,
    );
  });
});
