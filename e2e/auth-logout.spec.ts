import common from "@/i18n/locales/en/common.json" with { type: "json" };
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";

import { expect, test } from "./support/fixtures";
import { sessionCookies } from "./support/session";
import { createSignedInAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — leaving. */

test("signs out, clears the session, and locks the app behind login again", async ({
  page,
  context,
}) => {
  const user = freshUser();
  await createSignedInAccount(page, user);

  await page.goto(PATHS.APP);
  await expect(page.getByText(user.email)).toBeVisible();

  // Attached before the click so it only sees what leaving causes.
  const sessionChecks: string[] = [];
  page.on("request", (sent) => {
    if (sent.url().endsWith(ENDPOINTS.authUser)) sessionChecks.push(sent.url());
  });

  await page.getByRole("button", { name: common.app.logout }).click();

  // A public route, and specifically not back where they were: someone who
  // asked to leave should not be bounced into a return path.
  await expect(page).toHaveURL(PATHS.LOGIN);

  // Django clears them by resetting the value and dating the expiry into the
  // past, so "gone" means removed *or* empty.
  const { access, refresh } = await sessionCookies(context);
  expect(access?.value ?? "").toBe("");
  expect(refresh?.value ?? "").toBe("");

  // Every figure in the cache belonged to the user who just left, so the whole
  // cache goes — and the two lines below are how that is observable from
  // outside a browser that cannot see the cache. The guard on /login redirects
  // a *signed-in* visitor to /app, so a cached user surviving would have sent
  // this page straight back there; and it asked the server rather than reading
  // the answer it already had.
  await expect(page).toHaveURL(PATHS.LOGIN);
  expect(sessionChecks.length).toBeGreaterThan(0);

  // Returning by URL, the way someone would from a bookmark.
  await page.goto(PATHS.APP);
  await expect(page).toHaveURL(
    `${PATHS.LOGIN}?redirect=${encodeURIComponent(PATHS.APP)}`,
  );
});
