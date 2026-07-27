import Big from "big.js";

import type { Money } from "@/utils/money";

/** BRL, USD, and CAD all use two minor digits. */
const MINOR_UNITS_PER_UNIT = 100;

/**
 * Computes `round(Quantity × UnitPrice)` in the native currency's minor units.
 *
 * Half-even rounding matches the convention financial systems use for
 * unbiased totals. Exact throughout: `Big` never converts to a float.
 */
export function expectedCashMinorUnits(
  quantity: string,
  unitPrice: string,
): number {
  return Number(
    new Big(quantity)
      .times(unitPrice)
      .times(MINOR_UNITS_PER_UNIT)
      .round(0, Big.roundHalfEven)
      .toFixed(0),
  );
}

/**
 * The client-side pre-check for trade entry.
 *
 * Deliberately a **pure predicate, not a form validator**. The server is
 * authoritative on rounding, and a trade fee legitimately breaks the identity,
 * so Phase 6 decides how a mismatch is presented — as a warning, a hint, or
 * nothing at all. Phase 1's job is only to make the fact computable.
 *
 * Magnitudes are compared, not signed values: the sign encodes direction
 * (money out on a buy) and is not part of the arithmetic identity.
 */
export function matchesTradeIdentity(input: {
  quantity: string;
  unitPrice: string;
  money: Money;
}): boolean {
  const expected = expectedCashMinorUnits(input.quantity, input.unitPrice);

  return Math.abs(expected) === Math.abs(input.money.amount);
}
