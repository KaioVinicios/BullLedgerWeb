import type { ReactNode } from "react";

import { TextField } from "@/forms/TextField";
import type { Currency } from "@/utils/money";

type MoneyFieldProps = {
  name: string;
  label: string;
  currency: Currency;
  errors: unknown[];
  hint?: ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
};

/**
 * A money amount as the user types it: a plain string in the form's state,
 * parsed into integer minor units by `parseMoneyInput` only at submit — the
 * one place the money path is allowed to touch a number, and it is guarded
 * there. The currency rides beside the input rather than inside the value,
 * because it is not the user's to type: it follows the account's base
 * currency.
 */
export function MoneyField({
  name,
  label,
  currency,
  errors,
  hint,
  value,
  onBlur,
  onChange,
}: MoneyFieldProps) {
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
      className="pr-14"
      trailing={
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-sm text-muted-foreground"
        >
          {currency}
        </span>
      }
    />
  );
}
