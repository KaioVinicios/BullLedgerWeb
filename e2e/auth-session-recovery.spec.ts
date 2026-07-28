import { REFRESH_PATH } from "@/lib/sessionRecovery";
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { expect, test } from "./support/fixtures";
import { dropRefreshCookie, rejectAccessCookie } from "./support/session";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * `user-flows.md` §1 — the session ending, and being rebuilt.
 *
 * Access tokens live fifteen minutes, so no spec can wait one out. What the
 * helpers do instead is make the API refuse the access cookie while still
 * accepting the refresh one, which is the only distinction the client can act
 * on anyway.
 */

test("rebuilds an expired session without the user noticing", async ({
  page,
  context,
}) => {
  const user = freshUser();
  await createSignedInAccount(page, user);
  await rejectAccessCookie(context);

  const refreshCalls: string[] = [];
  const sessionChecks: string[] = [];
  page.on("request", (sent) => {
    if (sent.url().endsWith(REFRESH_PATH)) refreshCalls.push(sent.url());
    if (sent.url().endsWith(ENDPOINTS.authUser)) sessionChecks.push(sent.url());
  });

  await page.goto(PATHS.APP);

  // Still in, and on the page they asked for.
  await expect(page).toHaveURL(PATHS.APP);
  await expect(page.getByText(user.email)).toBeVisible();

  // Exactly one. A burst of 401s must await a single rotation — the refresh
  // tokens rotate and blacklist on use, so a second concurrent refresh would
  // be spending a token the first one already retired.
  expect(refreshCalls).toHaveLength(1);

  // The 401 and its replay: the original request is re-sent rather than
  // abandoned, which is what makes the recovery invisible.
  expect(sessionChecks.length).toBeGreaterThanOrEqual(2);
});

test("sends the user to login when the refresh cookie is gone too", async ({
  page,
  context,
}) => {
  const user = freshUser();
  await createSignedInAccount(page, user);
  await rejectAccessCookie(context);
  await dropRefreshCookie(context);

  await page.goto(PATHS.APP);

  // Nothing left to recover with, so the honest answer is the login screen —
  // still carrying where they were headed.
  await expect(page).toHaveURL(
    `${PATHS.LOGIN}?redirect=${encodeURIComponent(PATHS.APP)}`,
  );
});
