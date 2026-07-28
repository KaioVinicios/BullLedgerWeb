import type { BrowserContext, Cookie } from "@playwright/test";

/**
 * Reading and tampering with the session cookies.
 *
 * The app cannot do either — the JWTs are httpOnly by design — which is
 * exactly why these assertions belong at the E2E layer and nowhere else. A
 * component test can prove the client asks who is signed in; only a real
 * browser can prove the token it asked with was never reachable from
 * JavaScript.
 */

export const ACCESS_COOKIE = "bl-access";
export const REFRESH_COOKIE = "bl-refresh";

/**
 * Cookies allauth's session flow would leave behind if the API were serving
 * HTML. It is not, and the adapter suppresses the flash messages that produce
 * the second one — so both must stay absent.
 */
export const SESSION_LEFTOVER_COOKIES = ["sessionid", "messages"];

export interface SessionCookies {
  access?: Cookie;
  refresh?: Cookie;
  names: string[];
}

export async function sessionCookies(
  context: BrowserContext,
): Promise<SessionCookies> {
  const cookies = await context.cookies();

  return {
    access: cookies.find((cookie) => cookie.name === ACCESS_COOKIE),
    refresh: cookies.find((cookie) => cookie.name === REFRESH_COOKIE),
    names: cookies.map((cookie) => cookie.name),
  };
}

/**
 * A syntactically valid JWT the API will refuse: its signature is nonsense and
 * its `exp` is in 2001.
 *
 * Not a genuinely expired token — minting one would need the server's signing
 * key, which is the whole point of the design. What the client cannot tell
 * apart, and what this reproduces, is the only thing under test here: an
 * access cookie the API no longer accepts, alongside a refresh cookie it
 * still does.
 */
const REJECTED_ACCESS_TOKEN = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxMDAwMDAwMDAwLCJqdGkiOiJlMmUifQ",
  "e2e-not-a-real-signature",
].join(".");

/** Leaves the refresh cookie alone, so recovery has something to recover with. */
export async function rejectAccessCookie(
  context: BrowserContext,
): Promise<void> {
  const { access } = await sessionCookies(context);

  if (!access) {
    throw new Error("No access cookie to reject — is the session started?");
  }

  await context.addCookies([{ ...access, value: REJECTED_ACCESS_TOKEN }]);
}

/** Drops the refresh cookie, so recovery has nothing left to try. */
export async function dropRefreshCookie(
  context: BrowserContext,
): Promise<void> {
  const cookies = await context.cookies();

  await context.clearCookies();
  await context.addCookies(
    cookies.filter((cookie) => cookie.name !== REFRESH_COOKIE),
  );
}
