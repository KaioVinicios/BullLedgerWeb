import type { components } from "@/types/api";

/**
 * Runtime value lists for schema enums the UI has to iterate — a form
 * rendering one input per value, a Zod schema validating a URL param. The
 * generated types are `type`-only, so these arrays restate the values; the
 * `satisfies` plus the `AllOf` check make that restatement safe in both
 * directions — a value the schema dropped fails the `satisfies`, a value the
 * schema gained fails the exhaustiveness line, and either way the fix is
 * mechanical.
 */
type AllOf<Union, Listed extends readonly Union[]> = [
  Exclude<Union, Listed[number]>,
] extends [never]
  ? readonly Union[]
  : ["missing", Exclude<Union, Listed[number]>];

export type Archetype = components["schemas"]["ArchetypeEnum"];

export const ARCHETYPES = [
  "CASH_DEPOSIT",
  "FIXED_INCOME",
  "EXCHANGE_SECURITY",
  "NAV_FUND",
  "CRYPTO",
] as const satisfies readonly Archetype[];

const _archetypesExhaustive: AllOf<Archetype, typeof ARCHETYPES> = ARCHETYPES;
void _archetypesExhaustive;

export type InstitutionKind = components["schemas"]["KindsEnum"];

export const INSTITUTION_KINDS = [
  "BANK",
  "BROKERAGE",
  "EXCHANGE",
  "PENSION_PROVIDER",
] as const satisfies readonly InstitutionKind[];

const _kindsExhaustive: AllOf<InstitutionKind, typeof INSTITUTION_KINDS> =
  INSTITUTION_KINDS;
void _kindsExhaustive;

export type Country = components["schemas"]["CountryEnum"];

export const COUNTRIES = [
  "BR",
  "US",
  "CA",
] as const satisfies readonly Country[];

const _countriesExhaustive: AllOf<Country, typeof COUNTRIES> = COUNTRIES;
void _countriesExhaustive;

export type Currency = components["schemas"]["CurrencyEnum"];

export const CURRENCIES = [
  "BRL",
  "USD",
  "CAD",
] as const satisfies readonly Currency[];

const _currenciesExhaustive: AllOf<Currency, typeof CURRENCIES> = CURRENCIES;
void _currenciesExhaustive;

/**
 * The currency a country's accounts and instruments keep their books in.
 *
 * A *default*, never a lock: a Canadian brokerage can hold a USD account, so
 * the forms move the selection when the country changes and let the user
 * move it back. Found by the Phase 5 live walk, where a Canadian TFSA sat
 * denominated in Brazilian real because nothing followed the country.
 */
export const CURRENCY_BY_COUNTRY = {
  BR: "BRL",
  US: "USD",
  CA: "CAD",
} as const satisfies Record<Country, Currency>;

export type CostBasisMethod = "WEIGHTED_AVERAGE" | "FIFO";

/**
 * Which method the projection computed a basis figure with, by the *account's*
 * country — `business-rules.md` §Cost basis by country.
 *
 * The one rule in this file the API does not publish. `HoldingDetail` carries
 * `registration` and `tax_advantaged` but never the method, so the client
 * states it: BR (preço médio) and CA (adjusted cost base) use a weighted
 * average, the US uses FIFO / specific-lot. The same movements therefore yield
 * different realized gains in a US and a BR account, which is correct and by
 * design — and a user comparing two accounts needs to be told why.
 *
 * A **statement, never a computation**: the figure itself is always read from
 * the server. This is a copy of a document, so if `business-rules.md` moves,
 * this moves with it.
 */
export const COST_BASIS_METHOD_BY_COUNTRY = {
  BR: "WEIGHTED_AVERAGE",
  CA: "WEIGHTED_AVERAGE",
  US: "FIFO",
} as const satisfies Record<Country, CostBasisMethod>;

export type Registration = components["schemas"]["RegistrationEnum"];

/**
 * Registrations grouped by the country that scopes them. The grouping *is*
 * the validity rule from `business-rules.md` — a form that offers only the
 * selected country's rows can never send an invalid pairing — and the
 * exhaustiveness check below proves no registration was left out of a group,
 * so a wrapper the schema gains cannot silently become unofferable.
 */
export const REGISTRATIONS_BY_COUNTRY = {
  BR: ["BR_TAXABLE", "BR_PREV_PGBL", "BR_PREV_VGBL"],
  US: ["US_TAXABLE", "US_401K", "US_IRA_TRADITIONAL", "US_IRA_ROTH"],
  CA: ["CA_NON_REGISTERED", "CA_RRSP", "CA_TFSA", "CA_FHSA"],
} as const satisfies Record<Country, readonly Registration[]>;

export const REGISTRATIONS = [
  ...REGISTRATIONS_BY_COUNTRY.BR,
  ...REGISTRATIONS_BY_COUNTRY.US,
  ...REGISTRATIONS_BY_COUNTRY.CA,
] as const;

const _registrationsExhaustive: AllOf<Registration, typeof REGISTRATIONS> =
  REGISTRATIONS;
void _registrationsExhaustive;

/**
 * Where the tax advantage attaches (business-rules.md): to the *account* in
 * the US and Canada — these registrations — and to the *instrument* in
 * Brazil, which is why no `BR_*` value appears here. `BR_PREV_*` is the
 * hybrid: account-level tax fields, handled by `isBrPrev`.
 */
export const ACCOUNT_ADVANTAGED_REGISTRATIONS = [
  "US_401K",
  "US_IRA_TRADITIONAL",
  "US_IRA_ROTH",
  "CA_RRSP",
  "CA_TFSA",
  "CA_FHSA",
] as const satisfies readonly Registration[];

export function isAccountAdvantaged(registration: Registration): boolean {
  return (ACCOUNT_ADVANTAGED_REGISTRATIONS as readonly string[]).includes(
    registration,
  );
}

export function isBrPrev(
  registration: Registration,
): registration is "BR_PREV_PGBL" | "BR_PREV_VGBL" {
  return registration === "BR_PREV_PGBL" || registration === "BR_PREV_VGBL";
}

export type PlanType = components["schemas"]["PlanTypeEnum"];

/**
 * The plan type is already spelled inside the registration; deriving it keeps
 * the form from asking the same question twice with room to disagree.
 */
export function planTypeOf(registration: Registration): PlanType | null {
  if (registration === "BR_PREV_PGBL") return "PGBL";
  if (registration === "BR_PREV_VGBL") return "VGBL";
  return null;
}

export type TaxRegime = components["schemas"]["TaxRegimeEnum"];

export const TAX_REGIMES = [
  "PROGRESSIVE",
  "REGRESSIVE",
] as const satisfies readonly TaxRegime[];

const _taxRegimesExhaustive: AllOf<TaxRegime, typeof TAX_REGIMES> = TAX_REGIMES;
void _taxRegimesExhaustive;

export type TaxedOn = components["schemas"]["TaxedOnEnum"];

export const TAXED_ON = [
  "WHOLE_AMOUNT",
  "GAINS_ONLY",
] as const satisfies readonly TaxedOn[];

const _taxedOnExhaustive: AllOf<TaxedOn, typeof TAXED_ON> = TAXED_ON;
void _taxedOnExhaustive;

export type MovementType = components["schemas"]["TypeEnum"];

/**
 * The taxonomy as a runtime list, for the ledger's type filter and its Zod
 * search schema — the generated types are `type`-only and a `z.enum` needs
 * values.
 *
 * This is an enum list, not the matrix: *which* types a given archetype accepts
 * is the server's to say, and `GET /api/movement-types/` says it
 * (`schemas/movementSpec.ts` derives from that). What lives here is only the
 * set of legal values, guarded in both directions like every other list above.
 */
export const MOVEMENT_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "BUY",
  "SELL",
  "DIVIDEND",
  "DISTRIBUTION",
  "INTEREST",
  "COUPON",
  "MATURITY",
  "REDEMPTION",
  "FEE",
  "TAX",
  "SPLIT",
  "BONUS",
] as const satisfies readonly MovementType[];

const _movementTypesExhaustive: AllOf<MovementType, typeof MOVEMENT_TYPES> =
  MOVEMENT_TYPES;
void _movementTypesExhaustive;

// ——— Asset-archetype field enums ———

export type RateType = components["schemas"]["RateTypeEnum"];

export const RATE_TYPES = [
  "FIXED",
  "FLOATING",
  "INFLATION_LINKED",
] as const satisfies readonly RateType[];

const _rateTypesExhaustive: AllOf<RateType, typeof RATE_TYPES> = RATE_TYPES;
void _rateTypesExhaustive;

export type RateIndex = components["schemas"]["RateIndexEnum"];

export const RATE_INDEXES = [
  "CDI",
  "SELIC",
  "IPCA",
  "IGPM",
  "NONE",
] as const satisfies readonly RateIndex[];

const _rateIndexesExhaustive: AllOf<RateIndex, typeof RATE_INDEXES> =
  RATE_INDEXES;
void _rateIndexesExhaustive;

export type Compounding = components["schemas"]["CompoundingEnum"];

export const COMPOUNDINGS = [
  "DAILY",
  "MONTHLY",
] as const satisfies readonly Compounding[];

const _compoundingsExhaustive: AllOf<Compounding, typeof COMPOUNDINGS> =
  COMPOUNDINGS;
void _compoundingsExhaustive;

export type DepositInsurance = components["schemas"]["DepositInsuranceEnum"];

export const DEPOSIT_INSURANCES = [
  "FGC",
  "FDIC",
  "CDIC",
  "NONE",
] as const satisfies readonly DepositInsurance[];

const _depositInsurancesExhaustive: AllOf<
  DepositInsurance,
  typeof DEPOSIT_INSURANCES
> = DEPOSIT_INSURANCES;
void _depositInsurancesExhaustive;

export type Liquidity = components["schemas"]["LiquidityEnum"];

export const LIQUIDITIES = [
  "IMMEDIATE",
  "AT_MATURITY",
] as const satisfies readonly Liquidity[];

const _liquiditiesExhaustive: AllOf<Liquidity, typeof LIQUIDITIES> =
  LIQUIDITIES;
void _liquiditiesExhaustive;

export type InstrumentKind = components["schemas"]["InstrumentKindEnum"];

export const INSTRUMENT_KINDS = [
  "CERTIFICATE",
  "BOND",
] as const satisfies readonly InstrumentKind[];

const _instrumentKindsExhaustive: AllOf<
  InstrumentKind,
  typeof INSTRUMENT_KINDS
> = INSTRUMENT_KINDS;
void _instrumentKindsExhaustive;

export type IssuerType = components["schemas"]["IssuerTypeEnum"];

export const ISSUER_TYPES = [
  "GOVERNMENT",
  "CORPORATE",
  "MUNICIPAL",
  "BANK",
] as const satisfies readonly IssuerType[];

const _issuerTypesExhaustive: AllOf<IssuerType, typeof ISSUER_TYPES> =
  ISSUER_TYPES;
void _issuerTypesExhaustive;

export type CouponFrequency = components["schemas"]["CouponFrequencyEnum"];

export const COUPON_FREQUENCIES = [
  "NONE",
  "SEMIANNUAL",
  "ANNUAL",
] as const satisfies readonly CouponFrequency[];

const _couponFrequenciesExhaustive: AllOf<
  CouponFrequency,
  typeof COUPON_FREQUENCIES
> = COUPON_FREQUENCIES;
void _couponFrequenciesExhaustive;

export type SecurityType = components["schemas"]["SecurityTypeEnum"];

export const SECURITY_TYPES = [
  "STOCK",
  "ETF",
  "REIT",
  "FII",
] as const satisfies readonly SecurityType[];

const _securityTypesExhaustive: AllOf<SecurityType, typeof SECURITY_TYPES> =
  SECURITY_TYPES;
void _securityTypesExhaustive;

export type Exchange = components["schemas"]["ExchangeEnum"];

export const EXCHANGES = [
  "B3",
  "NYSE",
  "NASDAQ",
  "TSX",
  "TSXV",
] as const satisfies readonly Exchange[];

const _exchangesExhaustive: AllOf<Exchange, typeof EXCHANGES> = EXCHANGES;
void _exchangesExhaustive;
