import auth from "@/i18n/locales/en/auth.json" with { type: "json" };
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { postAnonymously } from "./support/api";
import { routeTo } from "./support/config";
import { expect, test } from "./support/fixtures";
import { emailedLinks, waitForEmailedLink } from "./support/mailbox";
import { createAccount, freshUser } from "./support/users";

/**
 * `user-flows.md` §1 — confirming an address.
 *
 * Verification is never a gate here: the route carries no guard and the app
 * stays usable whether or not anyone ever follows the link.
 */

test("confirms an address from the emailed link", async ({
  page,
  request,
  baseURL,
}) => {
  const user = freshUser();
  await createAccount(request, user);

  const link = await waitForEmailedLink({
    to: user.email,
    kind: "verify-email",
  });

  // The link must land on the SPA, never on the API host — that is the whole
  // reason the adapter overrides allauth's URL building.
  expect(link.origin).toBe(baseURL);

  await page.goto(link.pathname);

  await expect(
    page.getByRole("heading", { name: auth.verifyEmail.successTitle }),
  ).toBeVisible();

  // Verified server-side, not merely reported as such: allauth mails a new
  // confirmation only while an address is unverified, so a resend that sends
  // nothing is the server agreeing with the screen.
  await postAnonymously(ENDPOINTS.authResendEmail, { email: user.email });

  // Proving a *non*-event needs a wait; there is no state to poll toward.
  await page.waitForTimeout(1_500);
  expect(emailedLinks(user.email, "verify-email")).toHaveLength(1);
});

test("treats a link for an already-verified address as success", async ({
  page,
  request,
}) => {
  const user = freshUser();
  await createAccount(request, user);
  await waitForEmailedLink({ to: user.email, kind: "verify-email" });

  // A second link, minted while the address is still unverified — the shape of
  // every real version of this: a security scanner pre-visiting the first one,
  // Google auto-connecting a verified address, or simply a second click.
  await postAnonymously(ENDPOINTS.authResendEmail, { email: user.email });

  const first = await waitForEmailedLink({
    to: user.email,
    kind: "verify-email",
    nth: 1,
  });
  const second = await waitForEmailedLink({
    to: user.email,
    kind: "verify-email",
    nth: 2,
  });

  await page.goto(first.pathname);
  await expect(
    page.getByRole("heading", { name: auth.verifyEmail.successTitle }),
  ).toBeVisible();

  // The 2026-07-28 defect. allauth's `from_key` only matches an unverified
  // address, so a perfectly good key for an address verified through another
  // path used to 404 and read as a broken link. There is nothing left to
  // confirm, which is the request succeeding.
  //
  // The two keys are byte-identical when both are minted inside the same
  // second — Django's signing timestamp has one-second granularity — and that
  // changes nothing here: either way this is a valid signature for an address
  // that is verified by the time it is followed.
  await page.goto(second.pathname);
  await expect(
    page.getByRole("heading", { name: auth.verifyEmail.successTitle }),
  ).toBeVisible();
});

test("states the failure for a genuinely invalid link", async ({ page }) => {
  await page.goto(
    routeTo(PATHS.VERIFY_EMAIL, { key: "not-a-real-confirmation-key" }),
  );

  // The case above must not have swallowed this one: a tampered key still has
  // to fail, and fail with a way forward.
  await expect(
    page.getByRole("heading", { name: auth.verifyEmail.errorTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: auth.verifyEmail.requestNew }),
  ).toHaveAttribute("href", PATHS.RESEND_VERIFICATION);
});
