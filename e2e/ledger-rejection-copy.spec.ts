import app from "@/i18n/locales/en/app.json" with { type: "json" };
import errors from "@/i18n/locales/en/errors.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import {
  recordMovement,
  seedAccount,
  seedCertificate,
  seedInstitution,
  seedSecurity,
} from "./support/structure";
import { createSignedInAccount, freshUser } from "./support/users";

/**
 * What a rejection actually looks like to a person.
 *
 * The component tests prove the dictionary translates a code, and the API's own
 * suite proves the code and its params reach the wire. Only this one proves the
 * two halves meet — that a rejection raised by the real server arrives on
 * screen as a sentence, in the reader's language, carrying the figures the
 * server named. That failure mode is invisible to both other suites, because
 * each mocks the half the other owns.
 */

/** Anything that would betray the server's internals to a reader. */
const INTERNAL = [
  /movement_[a-z_]+/,
  /cash_delta|quantity_delta|fee_minor|unit_price/,
  /lots\.md|movements\.md|FR-MOV|FR-AUDIT|BR-[A-Z]+/,
  /positive_or_null|negative_or_null|nonzero/,
  /Constraint .* is violated/,
];

function namesNoInternals(message: string) {
  for (const pattern of INTERNAL) {
    expect(message, `leaked internals: ${message}`).not.toMatch(pattern);
  }
}

/** The literal words of an interpolated message, for locating it on screen. */
function literalOf(message: string): string {
  return message
    .split(/\{\{\w+\}\}/)
    .reduce(
      (best, part) => (part.trim().length > best.trim().length ? part : best),
      "",
    )
    .trim();
}

/**
 * A rejection the client cannot pre-empt, which is what makes it worth driving
 * a browser for.
 *
 * Most invalid combinations here are unofferable by construction, or caught by
 * the form's own validator and never sent — which is the design working. A
 * **backdated** exit is the exception: the client checks the contribution's
 * remainder as it stands today, while the server checks it as it stood on the
 * exit's own date. Sell on a date before the purchase and only the server can
 * object, so this is the one path that proves the whole chain — server rule to
 * code to params to a translated sentence on the field that produced it.
 */
test("a server rejection arrives as a sentence, not as a code", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const security = await seedSecurity(page, {
    name: "Petrobras",
    ticker: "PETR4",
  });

  await recordMovement(page, {
    account: account.id,
    asset: security.id,
    type: "BUY",
    occurred_on: "2026-06-01",
    quantity_delta: "10",
    unit_price: "100.0000",
    cash_delta: { amount: -100_000, currency: "BRL" },
    fee: null,
    fx_rate: null,
    note: "",
    lot: null,
  });

  await page.goto(PATHS.LEDGER_NEW);
  await page.getByRole("combobox", { name: app.ledger.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
  await page.getByRole("option", { name: security.name, exact: true }).click();
  await page.getByRole("combobox", { name: app.ledger.form.type }).click();
  await page.getByRole("option", { name: app.enums.movementType.SELL }).click();
  await page.getByRole("combobox", { name: app.ledger.form.lot }).click();
  await page.getByRole("option").first().click();

  // Dated five months before the purchase: the contribution held nothing then.
  await page.getByLabel(app.ledger.form.occurredOn).fill("2026-01-01");
  await page.getByLabel(app.ledger.form.quantityDisposed).fill("5");
  await page.getByLabel(app.ledger.form.unitPrice).fill("110.00");
  await page.getByLabel(app.ledger.form.amountReceived).fill("550.00");
  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();

  const rejection = page.getByText(literalOf(errors.movementLotOverdrawn));
  await expect(rejection).toBeVisible();

  // The sentence carries the figures the server sent, spelled for this reader.
  const text = (await rejection.textContent()) ?? "";
  namesNoInternals(text);
  expect(text).toContain("2026-01-01");
});

/**
 * The defect that started this: a CDB bought at 1,000 and redeemed at 1,150
 * could not be recorded at all. The lot holds principal, the yield is recorded
 * outside it, and the magnitude check refused the difference — on the server
 * and, mirrored, in the form's own validator before the request was even sent.
 */
test("a fixed-income redemption may return more than its principal", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  const account = await seedAccount(page, { name: "Corretora" });
  const bank = await seedInstitution(page, {
    name: "Banco X",
    kinds: ["BANK"],
  });
  const certificate = await seedCertificate(page, {
    name: "CDB 2030",
    issuer: bank.id,
  });

  await recordMovement(page, {
    account: account.id,
    asset: certificate.id,
    type: "BUY",
    occurred_on: "2026-01-10",
    quantity_delta: null,
    unit_price: null,
    cash_delta: { amount: -100_000, currency: "BRL" },
    fee: null,
    fx_rate: null,
    note: "",
    lot: null,
  });

  await page.goto(PATHS.LEDGER_NEW);
  await page.getByRole("combobox", { name: app.ledger.form.account }).click();
  await page.getByRole("option", { name: account.name }).click();
  await page.getByRole("combobox", { name: app.ledger.form.asset }).click();
  await page
    .getByRole("option", { name: certificate.name, exact: true })
    .click();

  // The hint names what this asset accepts. Located by the hint's own literal
  // words rather than by the type's name: Radix also renders a hidden native
  // <option> for every type, and `getByText` finds those first.
  await expect(
    page.getByText(literalOf(app.ledger.form.typesForArchetype)),
  ).toContainText(app.enums.movementType.COUPON);

  await page.getByRole("combobox", { name: app.ledger.form.type }).click();
  await page
    .getByRole("option", { name: app.enums.movementType.REDEMPTION })
    .click();
  await page.getByRole("combobox", { name: app.ledger.form.lot }).click();
  await page.getByRole("option").first().click();

  // R$1,150 out of a R$1,000 contribution: the R$150 is yield the lot never
  // held, and neither the client nor the server may call that an overdraw.
  await page.getByLabel(app.ledger.form.amountReceived).fill("1150.00");
  await page
    .getByRole("button", { name: app.ledger.form.create, exact: true })
    .click();

  await expect(page).toHaveURL(new RegExp(`${PATHS.LEDGER}$`));
});
