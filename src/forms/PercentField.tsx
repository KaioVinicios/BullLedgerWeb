import { useState, type ReactNode } from "react";

import { TextField } from "@/forms/TextField";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { useNumericInput } from "@/hooks/useNumericInput";
import { cn } from "@/lib/utils";
import { PERCENT_SCALE } from "@/utils/decimal";
import { separatorsFor } from "@/utils/numericInput";

/** What the mask holds. `PERCENT_SCALE` is what the wire still permits. */
const MASK_PLACES = 2;

type PercentFieldProps = {
  name: string;
  label: string;
  errors: unknown[];
  hint?: ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  /**
   * Prints a `−` inside the input's left edge. For a field whose value is a
   * magnitude the reader must read as a loss — the sign is displayed, never
   * typed and never stored.
   */
  sign?: "negative";
};

/**
 * A rate as the user thinks it: `13.75` for 13.75%. The wire wants the
 * fraction (`0.1375`), and the ÷100 happens at submit through Big — a string
 * decimal shift, never a float. The twin of `MoneyField`, with the unit pinned
 * beside the input because it is part of the reading, not the typing.
 *
 * `sign="negative"` pins a `−` to the other edge on the same terms, for a
 * field whose stored value is a magnitude the reader must read as a loss. It
 * is `aria-hidden` like the `%`, because the input's value really is the
 * magnitude and announcing a sign it does not contain would be a lie; the
 * caller carries that reading in the field's `hint` instead, which `TextField`
 * wires into `aria-describedby`.
 *
 * It types like `MoneyField` too, filling from the right at two places. That
 * mask is narrower than the data model: every percent-backed field is
 * `^-?\d{0,4}(?:\.\d{0,8})?$` on the wire, which permits six decimal places as
 * a percent, and `PERCENT_SCALE` stays 6 for exactly that reason.
 *
 * Hence the one conditional in this file. A field handed more precision than
 * the mask can express types freely instead, so opening a record and saving it
 * can never round a stored rate away. The decision is taken once, from the
 * initial value, and never flips while the user types — a field that changed
 * behaviour under the cursor would be worse than either mode. A field that
 * starts empty always accumulates, because a value that does not exist has no
 * precision to protect.
 */
export function PercentField({
  name,
  label,
  errors,
  hint,
  value,
  onBlur,
  onChange,
  sign,
}: PercentFieldProps) {
  const locale = useFormatLocale();
  const [freeForm] = useState(() => exceedsMask(value, locale));

  const handleChange = useNumericInput(
    freeForm
      ? { mode: "grouped", scale: PERCENT_SCALE, locale, value, onChange }
      : { mode: "accumulate", places: MASK_PLACES, locale, value, onChange },
  );

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
      onChange={handleChange}
      className={cn("pr-9 tabular-nums", sign === "negative" && "pl-7")}
      leading={
        sign === "negative" ? (
          <span
            // Decorative: the input's value is the magnitude, and announcing a
            // sign that is not in it would be a lie. The reading the sign
            // carries reaches assistive tech through the field's hint, which
            // `TextField` wires into `aria-describedby`.
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-muted-foreground"
          >
            −
          </span>
        ) : undefined
      }
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

function exceedsMask(value: string, locale: string): boolean {
  const { decimal } = separatorsFor(locale);
  const at = value.indexOf(decimal);

  return at !== -1 && value.length - at - 1 > MASK_PLACES;
}
