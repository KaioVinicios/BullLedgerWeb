import { expect, request as apiRequest } from "@playwright/test";

import { apiUrl } from "./config";

/**
 * One API call from nobody in particular.
 *
 * A fresh context every time, because the obvious alternative is a trap: the
 * `request` fixture a spec already used to create an account is holding that
 * account's JWT cookies, so the next unsafe call through it is
 * cookie-authenticated — and the API demands a CSRF token on those. The call
 * comes back 403, the email it should have sent never goes out, and the spec
 * fails somewhere else entirely, waiting for a message nothing ever queued.
 *
 * Anonymous is also what these endpoints are *for*. Asking for a reset link or
 * a new confirmation link is what someone locked out does, and the API does
 * not require a session for either.
 */
export async function postAnonymously(
  endpoint: string,
  data: unknown,
): Promise<void> {
  const context = await apiRequest.newContext();

  try {
    const response = await context.post(apiUrl(endpoint), { data });
    expect(
      response.status(),
      `POST ${endpoint} failed: ${await response.text()}`,
    ).toBe(200);
  } finally {
    await context.dispose();
  }
}
