import type { ReactNode, Ref } from "react";

import { TextField } from "@/forms/TextField";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { useNumericInput } from "@/hooks/useNumericInput";

/** Fifteen digits stays inside `Number.MAX_SAFE_INTEGER` at every value. */
const MAX_DIGITS = 15;

type IntegerFieldProps = {
  name: string;
  label: string;
  errors: unknown[];
  hint?: ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * A whole count — how many decimal places a coin carries, which month a target
 * step starts from. The twin of `DecimalField` with the separator taken away,
 * which is the entire difference: a field that cannot hold a fraction should
 * not let one be typed and then rejected at submit.
 *
 * `inputMode="numeric"` rather than `decimal`, so the phone keypad it summons
 * has no separator key to press either.
 */
export function IntegerField({
  name,
  label,
  errors,
  hint,
  value,
  onBlur,
  onChange,
  ref,
}: IntegerFieldProps) {
  const locale = useFormatLocale();
  const handleChange = useNumericInput({
    mode: "grouped",
    scale: 0,
    integerDigits: MAX_DIGITS,
    locale,
    value,
    onChange,
  });

  return (
    <TextField
      ref={ref}
      name={name}
      label={label}
      inputMode="numeric"
      autoComplete="off"
      errors={errors}
      hint={hint}
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
      className="tabular-nums"
    />
  );
}
