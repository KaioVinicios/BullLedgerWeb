import type { MovementShape, MovementTypeSpec } from "@/schemas/movementSpec";
import type { components } from "@/types/api";
import { parseMoneyInput, type Currency, type Money } from "@/utils/money";

type CashRule = components["schemas"]["CashRuleEnum"];
type QuantityRule = components["schemas"]["QuantityRuleEnum"];
type MovementRecordRequest = components["schemas"]["MovementRecordRequest"];
type MovementType = components["schemas"]["TypeEnum"];

/**
 * Which way a corporate action moved the position. Only `NONZERO` shapes ask —
 * a split can add units or remove them, and it is the one field where the user
 * genuinely chooses a direction rather than the type implying it.
 */
export type QuantityDirection = "GAINED" | "LOST";

/**
 * The entry form's state, flat.
 *
 * Flat rather than nested per shape for the same reason `AssetForm` is: someone
 * who picks the wrong type and comes back must not find their typing gone.
 * Every numeric field is a **string as typed**, in the user's locale, and
 * becomes a number exactly once — here, at the wire.
 */
export interface MovementFormValues {
  account: string;
  /** Empty means a movement of the account's own cash. */
  asset: string;
  type: MovementType;
  occurred_on: string;
  /** A magnitude. The sign comes from the shape, never from the keyboard. */
  quantity: string;
  direction: QuantityDirection;
  unit_price: string;
  /** What actually moved, fees included — see `grossMinorUnits`. */
  amount: string;
  fee: string;
  fx_rate: string;
  note: string;
  lot: string;
}

export interface MovementWireInput {
  values: MovementFormValues;
  spec: MovementTypeSpec;
  shape: MovementShape;
  /** The asset's native currency, or the account's base currency without one. */
  currency: Currency;
  locale: string;
}

const ALL_ZEROS = /^-?0*(?:\.0*)?$/;

/**
 * Flips a decimal string's sign textually. Textual because these values run to
 * eighteen decimal places — crypto quantities — and multiplying by -1 would put
 * them through a float on the way.
 */
export function negateDecimal(value: string): string {
  if (ALL_ZEROS.test(value)) return value;

  return value.startsWith("-") ? value.slice(1) : `-${value}`;
}

function magnitudeOf(value: string): string {
  const trimmed = value.trim();

  return trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;
}

/** Applies the shape's cash rule to an amount the user typed unsigned. */
export function signedCash(magnitude: Money, rule: CashRule): Money {
  const amount = Math.abs(magnitude.amount);

  return {
    amount: rule === "ZERO" ? 0 : rule === "NEGATIVE" ? -amount : amount,
    currency: magnitude.currency,
  };
}

/** Applies the shape's quantity rule; `null` is a real answer, not a failure. */
export function signedQuantity(
  magnitude: string,
  rule: QuantityRule,
  direction: QuantityDirection,
): string | null {
  if (rule === "NULL") return null;

  const value = magnitudeOf(magnitude);
  if (value === "") return null;

  switch (rule) {
    case "POSITIVE":
    case "POSITIVE_OR_NULL":
      return value;
    case "NEGATIVE":
    case "NEGATIVE_OR_NULL":
      return negateDecimal(value);
    case "NONZERO":
      return direction === "LOST" ? negateDecimal(value) : value;
  }
}

/**
 * The trade's value before its fee, in minor units.
 *
 * The server keeps `fee` as a positive magnitude *already folded into*
 * `cash_delta` — a buy of 194.00 with a 10.00 fee settles at -204.00 — so
 * recovering the gross means removing the fee in the direction the cash moved.
 * Integer arithmetic throughout; this is the money path.
 */
export function grossMinorUnits(
  cash: Money,
  fee: Money | null,
  rule: CashRule,
): number {
  const settled = Math.abs(cash.amount);
  const charged = fee ? Math.abs(fee.amount) : 0;

  return rule === "NEGATIVE" ? settled - charged : settled + charged;
}

/**
 * Builds the request body, or `null` when an amount cannot be represented
 * exactly.
 *
 * Null rather than a rounded guess: `parseMoneyInput` refuses anything it
 * cannot hold, and passing that refusal through is the only honest option on
 * the money path. The form renders it as a field error.
 */
export function toMovementRequest({
  values,
  spec,
  shape,
  currency,
  locale,
}: MovementWireInput): MovementRecordRequest | null {
  const typed = values.amount.trim();
  // A corporate action moves no cash, but `cash_delta` is required by the
  // schema — so an untouched amount there is a real zero, not a missing value.
  const parsed =
    typed === "" && shape.cash === "ZERO"
      ? ({ amount: 0, currency } satisfies Money)
      : parseMoneyInput(typed, currency, locale);
  if (!parsed) return null;

  const feeTyped = values.fee.trim();
  const parsedFee =
    spec.fee_allowed && feeTyped !== ""
      ? parseMoneyInput(feeTyped, currency, locale)
      : null;
  if (spec.fee_allowed && feeTyped !== "" && !parsedFee) return null;

  const quantity = signedQuantity(
    values.quantity,
    shape.quantity,
    values.direction,
  );
  const unitPrice = values.unit_price.trim();

  return {
    account: values.account,
    type: values.type,
    occurred_on: values.occurred_on,
    asset: values.asset === "" ? null : values.asset,
    quantity_delta: quantity,
    // A price without a quantity is meaningless and the server says so; the
    // pairing is decided here so the form never has to remember to clear it.
    unit_price:
      spec.unit_price === "WITH_QUANTITY" && quantity !== null && unitPrice
        ? unitPrice
        : null,
    cash_delta: signedCash(parsed, shape.cash),
    fee: parsedFee ? signedCash(parsedFee, "POSITIVE") : null,
    fx_rate: values.fx_rate.trim() === "" ? null : values.fx_rate.trim(),
    note: values.note.trim(),
    lot: values.lot === "" ? null : values.lot,
  };
}
