import type { ReactNode } from "react";

import { TextField } from "@/forms/TextField";

type PercentFieldProps = {
  name: string;
  label: string;
  errors: unknown[];
  hint?: ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
};

/**
 * A rate as the user thinks it: `13.75` for 13.75%. The wire wants the
 * fraction (`0.1375`), and the ÷100 happens at submit through Big — a string
 * decimal shift, never a float. The twin of `MoneyField`, with the unit
 * pinned beside the input because it is part of the reading, not the typing.
 */
export function PercentField({
  name,
  label,
  errors,
  hint,
  value,
  onBlur,
  onChange,
}: PercentFieldProps) {
  return (
    <TextField
      name={name}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      errors={errors}
      hint={hint}
      value={value}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
      className="pr-9"
      trailing={
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-sm text-muted-foreground"
        >
          %
        </span>
      }
    />
  );
}
