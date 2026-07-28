import auth from "@/i18n/locales/en/auth.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { waitForEmailedLink } from "./support/mailbox";
import { createAccount, freshUser } from "./support/users";

/** `user-flows.md` §1 — asking for another confirmation link. */

test("resends a confirmation link, then holds a cooldown", async ({
  page,
  request,
}) => {
  const user = freshUser();
  await createAccount(request, user);
  // The one signup mails; the resend below is the second.
  await waitForEmailedLink({ to: user.email, kind: "verify-email" });

  await page.goto(PATHS.RESEND_VERIFICATION);
  await page.getByLabel(auth.fields.email).fill(user.email);

  const submit = page.locator('button[type="submit"]');
  await submit.click();

  await expect(page.getByText(auth.resendVerification.sent)).toBeVisible();

  // Dead controls are a bug; a control that says why it is dead is a design.
  // Only the number moves, so the sentence before it is what to assert on.
  const [cooldownPrefix] =
    auth.resendVerification.cooldown.split("{{seconds}}");
  await expect(submit).toBeDisabled();
  await expect(submit).toContainText(cooldownPrefix!);

  // The link it sent has to work — a resend that mails a dead key is worse
  // than one that mails nothing.
  const link = await waitForEmailedLink({
    to: user.email,
    kind: "verify-email",
    nth: 2,
  });

  await page.goto(link.pathname);
  await expect(
    page.getByRole("heading", { name: auth.verifyEmail.successTitle }),
  ).toBeVisible();
});
