import Big from "big.js";

import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { Institution } from "@/services/institutions";
import { compareAccounts } from "@/utils/accountLabel";
import type {
  AccountGroup,
  HoldingSummary,
  PortfolioOverview,
} from "@/services/portfolio";
import { SCALE } from "@/utils/decimal";
import {
  minorUnitsToDecimalString,
  type Currency,
  type Money,
} from "@/utils/money";

/**
 * Whether a row is a position the user still has, rather than one they once had.
 *
 * The overview's rows are built from every asset that has ever had a movement
 * in an account, not from open positions, so a fully sold holding arrives as a
 * real row reading zero. Every screen that means "what I hold" filters here.
 *
 * The two archetype families are mutually exclusive by construction: unit-based
 * holdings carry a `quantity` and principal-based ones carry `null` there, so
 * one branch decides which figure is the position.
 *
 * **Not a test on `value`.** A held position the server could not price arrives
 * with `value: null` and a `NO_QUOTE` / `NO_FX` entry in `missing[]`. It is
 * held; its worth is unknown. Those are different facts and only one of them
 * means the row should disappear.
 *
 * Zero is compared through `Big` on the quantity because it is a decimal string
 * — `"0.000000"` is zero and `!== "0"` — and directly on the basis because
 * `Money.amount` is an integer count of minor units.
 */
export function isOpenPosition(holding: HoldingSummary): boolean {
  return holding.quantity !== null
    ? !new Big(holding.quantity).eq(0)
    : holding.cost_basis_remaining_native.amount !== 0;
}

/**
 * The key of the group holding accounts with no institution behind them.
 *
 * A sentinel rather than an id, which is why the screen's `closed` search
 * parameter is a list of strings and not of uuids: self-custody is a real
 * arrangement, and `Account.institution` is nullable to say so.
 */
export const NO_INSTITUTION = "none";

export interface CustodyAccountGroup {
  accountId: string;
  /** Null when the rollup names an account the live list does not — an archived one. */
  account: Account | null;
  cash: Money | null;
  subtotal: Money;
  complete: boolean;
  holdings: readonly HoldingSummary[];
}

export interface CustodyInstitutionGroup {
  key: string;
  /** Null for the unaffiliated group; the screen supplies its own label. */
  institution: Institution | null;
  subtotal: Money;
  complete: boolean;
  accounts: readonly CustodyAccountGroup[];
}

/**
 * The rollup, re-hung under the institutions that actually hold it.
 *
 * The API groups by account because that is where a movement is recorded. A
 * person thinks one level up — "what is at my broker" — and the institution is
 * one join away, on `Account.institution`. So this is a regrouping and not a
 * request: no endpoint publishes it and none needs to.
 *
 * Every account the rollup names survives the grouping, including one whose
 * record the live list does not carry. Dropping it would be tidier and wrong:
 * the subtotals are the server's, and they must still add up to the total.
 */
export function groupByCustody(
  overview: PortfolioOverview,
  accounts: readonly Account[],
  institutions: readonly Institution[],
): readonly CustodyInstitutionGroup[] {
  const currency = overview.total_value.currency;
  const accountById = new Map(accounts.map((row) => [row.id, row]));
  const institutionById = new Map(institutions.map((row) => [row.id, row]));
  const buckets = new Map<string, CustodyAccountGroup[]>();

  for (const group of overview.accounts) {
    const account = accountById.get(group.account) ?? null;
    const key = account?.institution ?? NO_INSTITUTION;
    const bucket = buckets.get(key) ?? [];

    bucket.push(toAccountGroup(group, account));
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, accountGroups]) => ({
      key,
      institution: institutionById.get(key) ?? null,
      subtotal: {
        amount: accountGroups.reduce((sum, a) => sum + a.subtotal.amount, 0),
        currency,
      },
      complete: accountGroups.every((a) => a.complete),
      accounts: [...accountGroups].sort(byAccountName),
    }))
    .sort(byInstitutionName);
}

function toAccountGroup(
  group: AccountGroup,
  account: Account | null,
): CustodyAccountGroup {
  return {
    accountId: group.account,
    account,
    cash: group.cash,
    subtotal: group.subtotal,
    complete: group.complete,
    holdings: group.holdings.filter(isOpenPosition),
  };
}

/** An account the live list does not name sorts last, where its em dash is. */
function byAccountName(a: CustodyAccountGroup, b: CustodyAccountGroup): number {
  if (a.account === null) return b.account === null ? 0 : 1;
  if (b.account === null) return -1;
  return compareAccounts(a.account, b.account);
}

/** The unaffiliated group sorts last, after every named institution. */
function byInstitutionName(
  a: CustodyInstitutionGroup,
  b: CustodyInstitutionGroup,
): number {
  if (a.institution === null) return b.institution === null ? 0 : 1;
  if (b.institution === null) return -1;
  return a.institution.name.localeCompare(b.institution.name);
}

/**
 * Σ over a nullable money leg, and whether every leg was there.
 *
 * A null is not a zero: the server sends one when it could not value a
 * position, so a sum that swallowed it would present a short total as a
 * complete one. The flag is what lets the screen say which it is.
 */
function sumMoney(
  values: readonly (Money | null)[],
  currency: Currency,
): { total: Money | null; complete: boolean } {
  const present = values.filter((value): value is Money => value !== null);

  return {
    total:
      present.length === 0
        ? null
        : {
            amount: present.reduce((sum, value) => sum + value.amount, 0),
            currency,
          },
    complete: present.length === values.length,
  };
}

/**
 * A per-unit figure from a minor-unit total and a decimal-string count.
 *
 * The money never divides as a number: it becomes a decimal string through
 * `minorUnitsToDecimalString` first, exactly as `formatMoney` does, and `Big`
 * carries the division. The result is a price rather than money — up to
 * `SCALE.unitPrice` places — so it is rendered with `formatUnitPrice`.
 */
function perUnit(total: Money | null, quantity: string | null): string | null {
  if (total === null || quantity === null) return null;

  const units = new Big(quantity);
  if (units.eq(0)) return null;

  return new Big(minorUnitsToDecimalString(total.amount))
    .div(units)
    .round(SCALE.unitPrice)
    .toString();
}

export interface AssetHoldingRow {
  holding: HoldingSummary;
  account: Account | null;
  institution: Institution | null;
}

export interface AssetGroup {
  assetId: string;
  asset: Asset | null;
  rows: readonly AssetHoldingRow[];
  /** Decimal string; null for a principal-based asset, which has no unit count. */
  quantity: string | null;
  value: Money | null;
  invested: Money | null;
  unrealizedGain: Money | null;
  /** Decimal-string fraction, recomputed from summed legs — never averaged. */
  totalReturn: string | null;
  /** Decimal string in the asset's own currency; null without a unit count. */
  unitCost: string | null;
  currentPrice: string | null;
  /** False when any row could not be valued, so the totals are short of it. */
  complete: boolean;
}

/**
 * The rollup inverted: one entry per asset, and the accounts holding it.
 *
 * The custody pivot answers "what is at my broker"; this answers "where is my
 * Apple, and how much of it is there in total". Same rows, same single cached
 * response — only the grouping key changes.
 *
 * **Consolidation is restricted to what sums exactly.** Quantity, value,
 * invested, and unrealized gain are additive. `total_return` is not: it is a
 * ratio, and the mean of two rates is not the rate of the whole, so it is
 * recomputed as Σgains ÷ Σinvested from the legs themselves.
 *
 * Summing the *native* legs across accounts is sound because an asset has
 * exactly one `currency` — which is what makes an average unit cost a real
 * figure here rather than a blend of exchange rates.
 */
export function groupByAsset(
  overview: PortfolioOverview,
  accounts: readonly Account[],
  assets: readonly Asset[],
  institutions: readonly Institution[],
): readonly AssetGroup[] {
  const currency = overview.total_value.currency;
  const accountById = new Map(accounts.map((row) => [row.id, row]));
  const assetById = new Map(assets.map((row) => [row.id, row]));
  const institutionById = new Map(institutions.map((row) => [row.id, row]));
  const buckets = new Map<string, AssetHoldingRow[]>();

  for (const group of overview.accounts) {
    for (const holding of group.holdings.filter(isOpenPosition)) {
      const account = accountById.get(holding.account) ?? null;
      const bucket = buckets.get(holding.asset) ?? [];

      bucket.push({
        holding,
        account,
        institution:
          account?.institution == null
            ? null
            : (institutionById.get(account.institution) ?? null),
      });
      buckets.set(holding.asset, bucket);
    }
  }

  return [...buckets.entries()]
    .map(([assetId, rows]) => toAssetGroup(assetId, rows, assetById, currency))
    .sort(byValueDescending);
}

function toAssetGroup(
  assetId: string,
  rows: readonly AssetHoldingRow[],
  assetById: ReadonlyMap<string, Asset>,
  currency: Currency,
): AssetGroup {
  const holdings = rows.map((row) => row.holding);

  const quantity = holdings.every((h) => h.quantity === null)
    ? null
    : holdings
        .reduce((sum, h) => sum.plus(h.quantity ?? 0), new Big(0))
        .toString();

  const value = sumMoney(
    holdings.map((h) => h.value),
    currency,
  );
  const invested = sumMoney(
    holdings.map((h) => h.invested),
    currency,
  );
  const unrealized = sumMoney(
    holdings.map((h) => h.unrealized_gain),
    currency,
  );
  const realized = sumMoney(
    holdings.map((h) => h.realized_gain),
    currency,
  );
  const income = sumMoney(
    holdings.map((h) => h.income_received),
    currency,
  );

  // Native legs, for the per-unit figures: one asset, one currency.
  const basis = sumMoney(
    holdings.map((h) => h.cost_basis_remaining_native),
    currency,
  );
  const market = sumMoney(
    holdings.map((h) => h.current_value_native),
    currency,
  );

  return {
    assetId,
    asset: assetById.get(assetId) ?? null,
    rows: [...rows].sort(byAccountLabel),
    quantity,
    value: value.total,
    invested: invested.total,
    unrealizedGain: unrealized.total,
    totalReturn: consolidatedReturn(
      realized.total,
      unrealized.total,
      income.total,
      invested.total,
    ),
    unitCost: perUnit(basis.total, quantity),
    currentPrice: market.complete ? perUnit(market.total, quantity) : null,
    complete: value.complete,
  };
}

/**
 * Σgains ÷ Σinvested, which is the whole position's return.
 *
 * Null when any leg is missing or nothing was invested — a return with no basis
 * behind it is unknown, and a zero denominator has no answer to give.
 */
function consolidatedReturn(
  realized: Money | null,
  unrealized: Money | null,
  income: Money | null,
  invested: Money | null,
): string | null {
  if (
    realized === null ||
    unrealized === null ||
    income === null ||
    invested === null ||
    invested.amount === 0
  ) {
    return null;
  }

  return new Big(realized.amount + unrealized.amount + income.amount)
    .div(invested.amount)
    .round(SCALE.rate)
    .toString();
}

/** The bigger position first: this pivot is read to find the large exposures. */
function byValueDescending(a: AssetGroup, b: AssetGroup): number {
  return (b.value?.amount ?? 0) - (a.value?.amount ?? 0);
}

/** By the label the reader sees — institution first — an unresolved one last. */
function byAccountLabel(a: AssetHoldingRow, b: AssetHoldingRow): number {
  if (a.account === null) return b.account === null ? 0 : 1;
  if (b.account === null) return -1;
  return compareAccounts(a.account, b.account);
}
