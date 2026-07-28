import { randomUUID } from "node:crypto";

import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { ENDPOINTS } from "@/services/endpoints";
import { apiUrl } from "./config";

export interface TestUser {
  email: string;
  password: string;
}

/**
 * A user nobody else is using.
 *
 * Registration is cheap and the specs run in parallel against one real
 * database, so every spec that writes brings its own address. The timestamp
 * keeps the addresses sorted and greppable in the API log; the random suffix
 * is what actually makes them unique, since two workers can start inside the
 * same millisecond.
 *
 * The password is fixed and deliberately unlike the address: Django rejects a
 * password too similar to the username, and the username allauth derives from
 * these addresses is the `e2e-…` prefix.
 */
export function freshUser(): TestUser {
  const unique = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

  return {
    email: `e2e-${unique}@example.com`,
    password: "Cordilheira-42-Vento",
  };
}

async function register(
  context: APIRequestContext,
  user: TestUser,
): Promise<void> {
  const response = await context.post(apiUrl(ENDPOINTS.authRegistration), {
    data: {
      email: user.email,
      password1: user.password,
      password2: user.password,
      // Phase 4 owns the profile screen; registration sends the schema default
      // and nothing more, exactly as the register form does.
      reporting_currency: "BRL",
    },
  });

  expect(
    response.status(),
    `registration failed: ${await response.text()}`,
  ).toBe(201);
}

/**
 * Creates an account and leaves the browser signed out.
 *
 * Takes the standalone `request` fixture rather than `page.request` on
 * purpose: that context has its own cookie jar, so the account exists and the
 * browser never sees the session cookies registration sets. Specs about
 * signing in, resetting a password, or reaching a guarded route need exactly
 * that — a real account and no session.
 */
export async function createAccount(
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  await register(request, user);
}

/**
 * Creates an account and signs the browser into it, in one round trip.
 *
 * `page.request` shares cookies with the page, so the JWT cookies registration
 * sets are the ones the app will send — a genuine session, not a simulated
 * one. Used where being signed in is the *precondition* rather than the
 * subject; registering and signing in each have their own spec.
 */
export async function createSignedInAccount(
  page: Page,
  user: TestUser,
): Promise<void> {
  await register(page.request, user);
}

/** Signs an existing account in, in the browser's own cookie jar. */
export async function startSession(page: Page, user: TestUser): Promise<void> {
  const response = await page.request.post(apiUrl(ENDPOINTS.authLogin), {
    data: { email: user.email, password: user.password },
  });

  expect(response.status(), `login failed: ${await response.text()}`).toBe(200);
}
