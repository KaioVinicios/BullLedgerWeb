/**
 * Formats a decimal **string** without it ever becoming a JS number.
 *
 * `Intl.NumberFormat.format` accepts a decimal string at runtime (ES2023,
 * Intl.NumberFormat V3) and preserves it exactly — verified in this project's
 * runtime, where a 20-integer-digit amount and an 18-decimal quantity both
 * round-trip intact. That is the whole reason money and quantities never pass
 * through a float on their way to the screen.
 *
 * TypeScript's lib types lag the platform here: `format` admits
 * `StringNumericLiteral`, a template-literal type that only a string *literal*
 * can satisfy, so a value typed plain `string` is rejected at compile time
 * despite working correctly at run time. This is the one place that gap is
 * bridged, so the cast is stated once instead of scattered across formatters.
 */
export function formatNumericString(
  formatter: Intl.NumberFormat,
  value: string,
): string {
  return formatter.format(value as unknown as number);
}
