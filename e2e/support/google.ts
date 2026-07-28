import type { Page } from "@playwright/test";

/**
 * A stand-in for Google Identity Services.
 *
 * Google's consent screen needs a human, so the real popup cannot run
 * unattended. The seam this stubs is the narrowest one available: the script
 * `GoogleOAuthProvider` loads, which is where `@react-oauth/google` gets
 * `window.google.accounts.oauth2` from. Everything above it — the provider,
 * the hook, the mutation, the navigation — is the app's own code, running for
 * real.
 *
 * What it cannot cover is stated where it matters, in the spec: the
 * authorization code this hands back is meaningless to Google, so the
 * exchange stays covered by the API's own tests.
 */

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

/** The code the stubbed flow hands back, so a spec can assert it was forwarded. */
export const STUB_AUTHORIZATION_CODE = "e2e-google-authorization-code";

export type GoogleFlowOutcome =
  /** The user authorizes and Google returns a code. */
  | "code"
  /** The user declines on the consent screen — an OAuth-level refusal. */
  | "declined"
  /** The browser refuses to open the popup — not an OAuth error at all. */
  | "popup-blocked";

function requestCodeBody(outcome: GoogleFlowOutcome): string {
  switch (outcome) {
    case "code":
      return `config.callback({
        code: ${JSON.stringify(STUB_AUTHORIZATION_CODE)},
        scope: "openid profile email",
        authuser: "0",
        prompt: "consent",
      });`;
    case "declined":
      return `config.callback({
        error: "access_denied",
        error_description: "The user denied the request.",
      });`;
    case "popup-blocked":
      return `config.error_callback({ type: "popup_failed_to_open" });`;
  }
}

export async function stubGoogleSdk(
  page: Page,
  outcome: GoogleFlowOutcome = "code",
): Promise<void> {
  const script = `
    window.google = {
      accounts: {
        id: {
          initialize() {},
          prompt() {},
          renderButton() {},
          disableAutoSelect() {},
        },
        oauth2: {
          initCodeClient(config) {
            return {
              requestCode() {
                ${requestCodeBody(outcome)}
              },
            };
          },
          initTokenClient() {
            throw new Error(
              "This app runs the authorization-code flow; the implicit flow " +
                "must never be reached.",
            );
          },
        },
      },
    };
  `;

  await page.route(GSI_SCRIPT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: script,
    }),
  );
}
