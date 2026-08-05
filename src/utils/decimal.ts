import Big from "big.js";

import { formatNumericString } from "@/utils/intl";

/**
 * Decimal scales, read from the OpenAPI schema's own patterns:
 *   quantity_delta  ^-?\d{0,20}(?:\.\d{0,18})?$
 *   unit_price      ^-?\d{0,18}(?:\.\d{0,12})?$
 *   fx_rate, weight ^-?\d{0,4}(?:\.\d{0,8})?$
 */
export const SCALE = {
  quantity: 18,
  unitPrice: 12,
  rate: 8,
} as const;

/**
 * Quantities and prices stay decimal strings end to end: the wire sends
 * strings and `Intl` formats strings, so nothing needs converting and nothing
 * passes through a float.
 */
export function isValidDecimalString(value: string, scale: number): boolean {
  return new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`).test(value);
}

export function formatDecimal(
  value: string,
  locale: string,
  scale: number,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: scale,
  });

  return formatNumericString(formatter, value);
}

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
 * Normalizes a locale-formatted entry into the canonical decimal string the
 * API expects. Returns `null` when the value is not a number or carries more
 * precision than its scale allows.
 */
export function parseDecimalInput(
  input: string,
  locale: string,
  scale: number,
): string | null {
  const { group, decimal } = separatorsFor(locale);

  const normalized = input
    .replace(new RegExp(escapeForRegExp(group), "g"), "")
    .replace(new RegExp(escapeForRegExp(decimal), "g"), ".")
    .replace(/[^\d.-]/g, "")
    .trim();

  return isValidDecimalString(normalized, scale) ? normalized : null;
}

/**
 * Renders a decimal-string fraction as a percentage: `0.1375` → `13.75%`.
 * The multiplication goes through Big so the scale survives it.
 */
export function formatPercent(fraction: string, locale: string): string {
  const percent = new Big(fraction).times(100).toFixed();

  return `${formatDecimal(percent, locale, SCALE.rate)}%`;
}

/**
 * Percent entries keep two digits of headroom for the ÷100 shift: a rate is a
 * fraction at `SCALE.rate`, so a percent typed with more than `SCALE.rate - 2`
 * decimals would shift into a value the wire's pattern rejects.
 */
export const PERCENT_SCALE = SCALE.rate - 2;

/**
 * A canonical decimal string rendered in the reader's locale, ungrouped —
 * what a form *input* wants as a prefill, as opposed to what a table wants to
 * display. Ungrouped because the value is about to be re-parsed by the same
 * input it was written into, and thousands separators are noise on the way
 * back in.
 */
export function localizeDecimal(value: string, locale: string): string {
  return formatNumericString(
    new Intl.NumberFormat(locale, {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: SCALE.unitPrice,
    }),
    value,
  );
}

/**
 * A percent as the user typed it → the decimal-string fraction the wire wants:
 * `13.75` → `0.1375`. Locale-aware coming in, canonical going out, and the
 * shift goes through Big so nothing passes through a float.
 *
 * `null` when the entry is not a number or carries more precision than
 * `PERCENT_SCALE` leaves room for — the same refusal `parseDecimalInput`
 * makes, passed through rather than rounded away.
 */
export function percentToFraction(
  input: string,
  locale: string,
): string | null {
  const parsed = parseDecimalInput(input, locale, PERCENT_SCALE);

  return parsed === null ? null : new Big(parsed).div(100).toFixed();
}

/** The inverse, for prefilling a form from a stored fraction: `0.1375` → `13.75`. */
export function fractionToPercent(
  fraction: string | null | undefined,
  locale: string,
): string {
  return fraction
    ? localizeDecimal(new Big(fraction).times(100).toFixed(), locale)
    : "";
}
