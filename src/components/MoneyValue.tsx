import { cn } from "@/lib/utils";
import { formatMoney, type Money } from "@/utils/money";

interface MoneyValueProps {
  value: Money;
  /** BCP 47 tag. Separate concern from the currency: a pt-BR user may hold USD. */
  locale: string;
  className?: string;
}

/**
 * A recorded amount, formatted for reading.
 *
 * Monospace and tabular figures are not a costume here — they are what lets a
 * column of amounts align on the decimal point, which is the difference
 * between a ledger that can be scanned and one that has to be read.
 */
export function MoneyValue({ value, locale, className }: MoneyValueProps) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatMoney(value, locale)}
    </span>
  );
}
