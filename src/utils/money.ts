import type { components } from "@/types/api";
import { SCALE } from "@/utils/decimal";
import { formatNumericString } from "@/utils/intl";

export type Money = components["schemas"]["Money"];
export type Currency = components["schemas"]["CurrencyEnum"];

/** BRL, USD, and CAD all use two minor digits. */
const MINOR_DIGITS = 2;

/**
 * Renders integer minor units as a decimal string by inserting the point —
 * never by dividing. Division would put the amount through a float, which is
 * the one thing the money path must never do.
 */
export function minorUnitsToDecimalString(amount: number): string {
  const negative = amount < 0;
  const digits = Math.abs(amount)
    .toString()
    .padStart(MINOR_DIGITS + 1, "0");

  const whole = digits.slice(0, -MINOR_DIGITS);
  const fraction = digits.slice(-MINOR_DIGITS);

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Formats money for display. The amount travels as a decimal string the whole
 * way, so it never becomes a JS number between the wire and the screen.
 */
export function formatMoney(money: Money, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  });

  return formatNumericString(
    formatter,
    minorUnitsToDecimalString(money.amount),
  );
}

/**
 * Formats a unit price: money by denomination, a decimal string by precision.
 *
 * `formatMoney` cannot do this. A price per unit carries up to twelve decimal
 * places (`SCALE.unitPrice`) while a currency's own default is two, so pouring
 * one through the money formatter would truncate a real figure. It stays a
 * string the whole way, exactly like `formatDecimal`.
 */
export function formatUnitPrice(
  value: string,
  currency: Currency,
  locale: string,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: SCALE.unitPrice,
  });

  return formatNumericString(formatter, value);
}

/** Discovers a locale's group and decimal separators from Intl itself. */
function separatorsFor(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);

  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses a locale-formatted amount into integer minor units.
 *
 * Returns `null` for anything it cannot represent exactly — too many decimal
 * places, non-numeric input, or a magnitude beyond a safe integer — so a
 * caller must handle the failure rather than silently receive a wrong number.
 */
export function parseMoneyInput(
  input: string,
  currency: Currency,
  locale: string,
): Money | null {
  const { group, decimal } = separatorsFor(locale);

  const normalized = input
    .replace(new RegExp(escapeForRegExp(group), "g"), "")
    .replace(new RegExp(escapeForRegExp(decimal), "g"), ".")
    // Strip currency symbols, spaces, and any non-breaking space Intl emits.
    .replace(/[^\d.-]/g, "")
    .trim();

  const match = /^(-?)(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;

  const [, sign, whole, fraction = ""] = match;
  const minorUnits = `${whole}${fraction.padEnd(MINOR_DIGITS, "0")}`;

  // The only number conversion on the money path, and it is guarded: the
  // string is a plain integer, and anything beyond the exact range is
  // rejected rather than rounded.
  if (minorUnits.length > String(Number.MAX_SAFE_INTEGER).length) return null;

  const amount = Number(minorUnits);
  if (!Number.isSafeInteger(amount)) return null;

  return { amount: sign === "-" ? -amount : amount, currency };
}
