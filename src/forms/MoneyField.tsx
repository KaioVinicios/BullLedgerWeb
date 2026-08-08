import type { ReactNode, Ref } from "react";

import { TextField } from "@/forms/TextField";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { useNumericInput } from "@/hooks/useNumericInput";
import type { Currency } from "@/utils/money";

/** BRL, USD, and CAD all use two minor digits. */
const MINOR_DIGITS = 2;

type MoneyFieldProps = {
  name: string;
  label: string;
  currency: Currency;
  errors: unknown[];
  hint?: ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  /**
   * For a caller that has to put the cursor back — the ledger's "record and
   * add another" returns focus here, because the amount is where the next row
   * starts being typed.
   */
  ref?: Ref<HTMLInputElement>;
};

/**
 * A money amount as the user types it: digits fill from the right, so `2` is
 * `0.02` and `20000` is `200.00`. The mask is exact because a currency's minor
 * digits are fixed — the same fact `parseMoneyInput` relies on — which is why
 * quantities and prices, whose scales run to eighteen places, do not type this
 * way.
 *
 * The value stays a plain string in form state and becomes integer minor units
 * only at submit, through `parseMoneyInput`. That contract is unchanged: this
 * layer decides what the field may *become* while it is being typed, and the
 * parser still decides whether a finished entry is valid.
 *
 * An empty field stays empty rather than settling at `0.00`, because the two
 * are not the same answer — `AccountForm` sends `contribution_room` as `null`
 * for the first and `{ amount: 0 }` for the second.
 *
 * The currency rides beside the input rather than inside the value, because it
 * is not the user's to type: it follows the account's base currency.
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
  ref,
}: MoneyFieldProps) {
  const locale = useFormatLocale();
  const handleChange = useNumericInput({
    mode: "accumulate",
    places: MINOR_DIGITS,
    locale,
    value,
    onChange,
  });

  return (
    <TextField
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
      className="pr-14 tabular-nums"
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
