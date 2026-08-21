import type { ReactNode, Ref } from "react";

import { TextField } from "@/forms/TextField";
import type { ExplainMetric } from "@/i18n/explain";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { useNumericInput } from "@/hooks/useNumericInput";

type DecimalFieldProps = {
  name: string;
  label: string;
  /** Fraction digits the API's pattern allows — a `SCALE` member. */
  scale: number;
  /** Digits before the point — an `INTEGER_DIGITS` member. */
  integerDigits?: number;
  errors: unknown[];
  hint?: ReactNode;
  /** See `TextField`. */
  metric?: ExplainMetric;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  /** Pinned inside the input, the way `MoneyField` pins its currency. */
  unit?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

/**
 * A quantity, a unit price, or a rate: the figures whose scales are too large
 * for a mask. A crypto quantity carries eighteen decimal places and a unit
 * price twelve, so filling from the right the way `MoneyField` does would make
 * `10` mean 1e-17 rather than ten shares.
 *
 * So it types left to right and only two things happen to a keystroke.
 * Anything that is not a digit or a decimal separator is dropped, which is what
 * stops letters reaching a field that has no use for them. And thousands are
 * grouped as they appear, so the difference between 1,000,000 and 10,000,000 is
 * read rather than counted.
 *
 * The separator is the locale's, and a foreign one is accepted and translated:
 * an Android decimal keypad emits `.` whatever the interface language says, and
 * in `pt-BR` that is the *group* separator. Without the translation the field
 * would be untypeable on half the phones this app is aimed at.
 *
 * The value stays a string and `parseDecimalInput` converts it at submit,
 * exactly as before.
 */
export function DecimalField({
  name,
  label,
  scale,
  integerDigits,
  errors,
  hint,
  metric,
  value,
  onBlur,
  onChange,
  unit,
  ref,
}: DecimalFieldProps) {
  const locale = useFormatLocale();
  const handleChange = useNumericInput({
    mode: "grouped",
    scale,
    integerDigits,
    locale,
    value,
    onChange,
  });

  return (
    <TextField
      metric={metric}
      ref={ref}
      name={name}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      errors={errors}
      hint={hint}
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
      className={unit ? "pr-14 tabular-nums" : "tabular-nums"}
      trailing={
        unit ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-sm text-muted-foreground"
          >
            {unit}
          </span>
        ) : undefined
      }
    />
  );
}
