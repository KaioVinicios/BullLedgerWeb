import { expect, type Page } from "@playwright/test";

import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { CSRF_COOKIE, CSRF_HEADER, CSRF_PATH } from "@/lib/csrf";
import { PATHS } from "@/routes/path";
import { ENDPOINTS } from "@/services/endpoints";
import type { components } from "@/types/api";

import { apiUrl } from "./config";

/**
 * Builds portfolio structure through the real UI — the decision recorded in
 * `v1-e2e-todo.md`'s open questions: the Phase 5 specs create structure
 * through the forms once, and later phases seed via the API instead. These
 * helpers assume the English locale the shared fixture pins.
 */

export async function createInstitutionUI(
  page: Page,
  options: {
    name: string;
    kinds: Array<keyof typeof app.enums.kind>;
    selfCustody?: boolean;
  },
): Promise<void> {
  await page.goto(PATHS.INSTITUTIONS_NEW);
  await page.getByLabel(app.institutions.form.name).fill(options.name);

  for (const kind of options.kinds) {
    await page.getByRole("checkbox", { name: app.enums.kind[kind] }).check();
  }

  if (options.selfCustody) {
    await page
      .getByRole("switch", { name: app.institutions.form.selfCustody })
      .click();
  }

  await page
    .getByRole("button", { name: app.institutions.form.create })
    .click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.INSTITUTIONS}$`));
}

export async function createAccountUI(
  page: Page,
  options: {
    name: string;
    country: "Brazil" | "United States" | "Canada";
    registration: string;
    institution?: string;
  },
): Promise<void> {
  await page.goto(PATHS.ACCOUNTS_NEW);
  await page.getByLabel(app.accounts.form.name).fill(options.name);
  await page.getByRole("radio", { name: options.country, exact: true }).click();
  await page.getByRole("radio", { name: options.registration }).click();

  if (options.institution) {
    await page
      .getByRole("combobox", { name: app.accounts.form.institution })
      .click();
    await page.getByRole("option", { name: options.institution }).click();
  }

  await page.getByRole("button", { name: app.accounts.form.create }).click();
  await expect(page).toHaveURL(new RegExp(`${PATHS.ACCOUNTS}$`));
}

/**
 * The API-seeded half, for journeys where the structure is a *precondition*
 * rather than the subject. A ledger spec needs an account and an asset to
 * exist; driving two forms to get there would test Phase 5 again and make
 * every Phase 6 spec slower and more fragile for nothing.
 *
 * `page.request` rather than a standalone context, because it shares the
 * browser's cookie jar: the JWTs registration set are the ones these calls
 * authenticate with, and the CSRF cookie fetched here is the one the app will
 * read afterwards.
 */

type Account = components["schemas"]["Account"];
type Asset = components["schemas"]["Asset"];
type Movement = components["schemas"]["Movement"];
type MovementRecordRequest = components["schemas"]["MovementRecordRequest"];
type PriceQuote = components["schemas"]["PriceQuote"];
type Target = components["schemas"]["Target"];

/**
 * The API enforces CSRF on every cookie-authenticated unsafe request, and
 * Django hands the token out from one endpoint only — the same acquisition
 * `lib/csrf.ts` performs for the app.
 */
async function csrfToken(page: Page): Promise<string> {
  await page.request.get(apiUrl(CSRF_PATH));
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value;

  if (!token) throw new Error("No CSRF cookie — is the API running?");

  return token;
}

async function seed<T>(
  page: Page,
  endpoint: string,
  data: unknown,
): Promise<T> {
  const response = await page.request.post(apiUrl(endpoint), {
    data,
    headers: { [CSRF_HEADER]: await csrfToken(page) },
  });

  expect(
    response.status(),
    `POST ${endpoint} failed: ${await response.text()}`,
  ).toBe(201);

  return ((await response.json()) as { data: T }).data;
}

export function seedAccount(
  page: Page,
  options: {
    name: string;
    country?: "BR" | "US" | "CA";
    registration?: string;
    base_currency?: "BRL" | "USD" | "CAD";
  },
): Promise<Account> {
  return seed<Account>(page, ENDPOINTS.accounts, {
    name: options.name,
    country: options.country ?? "BR",
    registration: options.registration ?? "BR_TAXABLE",
    base_currency: options.base_currency ?? "BRL",
  });
}

/** An exchange-traded security, which is what most ledger journeys need. */
export function seedSecurity(
  page: Page,
  options: { name: string; ticker: string; currency?: "BRL" | "USD" | "CAD" },
): Promise<Asset> {
  return seed<Asset>(page, ENDPOINTS.assets, {
    name: options.name,
    archetype: "EXCHANGE_SECURITY",
    currency: options.currency ?? "BRL",
    country: options.currency === "USD" ? "US" : "BR",
    ticker: options.ticker,
    exchange: options.currency === "USD" ? "NASDAQ" : "B3",
    security_type: "STOCK",
    pays_distributions: true,
  });
}

export function seedCrypto(
  page: Page,
  options: { name: string; symbol: string },
): Promise<Asset> {
  return seed<Asset>(page, ENDPOINTS.assets, {
    name: options.name,
    archetype: "CRYPTO",
    currency: "BRL",
    country: "BR",
    symbol: options.symbol,
    decimals: 8,
    price_currency: "BRL",
  });
}

export function seedSavings(
  page: Page,
  options: { name: string },
): Promise<Asset> {
  return seed<Asset>(page, ENDPOINTS.assets, {
    name: options.name,
    archetype: "CASH_DEPOSIT",
    currency: "BRL",
    country: "BR",
    compounding: "MONTHLY",
    deposit_insurance: "FGC",
    liquidity: "IMMEDIATE",
    rate_type: "FLOATING",
    rate_index: "CDI",
  });
}

export function seedFund(
  page: Page,
  options: { name: string },
): Promise<Asset> {
  return seed<Asset>(page, ENDPOINTS.assets, {
    name: options.name,
    archetype: "NAV_FUND",
    currency: "BRL",
    country: "BR",
    fund_category: "MULTIMARKET",
  });
}

/**
 * One recorded movement, straight to the API — for the holdings a journey
 * needs to *have* rather than to create. Specs about the form still drive the
 * form.
 */
export function recordMovement(
  page: Page,
  body: MovementRecordRequest,
): Promise<Movement> {
  return seed<Movement>(page, ENDPOINTS.movements, body);
}

/**
 * One price quote, for the journeys where an existing quote is the precondition
 * rather than the subject. The table is insert-only and unique per
 * `(asset, date)`, so a spec calling this twice for one date gets a 400 — which
 * `seed` surfaces with the server's own body rather than a bare status.
 */
export function seedPriceQuote(
  page: Page,
  options: { asset: string; date: string; price: string },
): Promise<PriceQuote> {
  return seed<PriceQuote>(page, ENDPOINTS.priceQuotes, options);
}

/**
 * One target, for journeys where an existing target is the *precondition*
 * rather than the subject — reading a status, seeing a scope already taken,
 * archiving. The specs about authoring one drive the form.
 *
 * Takes the request union as the schema defines it, so the caller picks the
 * member and the type checker holds them to it: a `HOLDING` body carries no
 * archetype, and an archetype body carries no asset.
 */
export function seedTarget(
  page: Page,
  body: components["schemas"]["TargetRequest"],
): Promise<Target> {
  return seed<Target>(page, ENDPOINTS.targets, body);
}

/**
 * Voids a movement, for journeys where the void is a *precondition* — the
 * projections letting go of a position — rather than the subject. The
 * correct/void journey itself drives the dialog through the UI.
 *
 * Answers 200 rather than 201: it returns the voided row, it does not create
 * one, which is why it does not go through `seed`.
 */
export async function voidMovement(page: Page, id: string): Promise<void> {
  const response = await page.request.post(apiUrl(ENDPOINTS.movementVoid(id)), {
    headers: { [CSRF_HEADER]: await csrfToken(page) },
  });

  expect(
    response.status(),
    `voiding ${id} failed: ${await response.text()}`,
  ).toBe(200);
}
