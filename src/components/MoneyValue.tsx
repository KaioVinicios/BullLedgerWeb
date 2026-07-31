import { useFormatLocale } from "@/hooks/useFormatLocale";
import { cn } from "@/lib/utils";
import { formatMoney, type Money } from "@/utils/money";

interface MoneyValueProps {
  value: Money;
  /**
   * BCP 47 tag, only where it must differ from the active interface language
   * — the design system renders one amount in three locales side by side.
   * Left off, the component follows the user's language, which is what every
   * screen wants.
   *
   * Separate concern from the currency: a pt-BR user may hold USD, and the
   * currency travels with the value while the locale comes from the language.
   */
  locale?: string;
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
  const activeLocale = useFormatLocale();

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatMoney(value, locale ?? activeLocale)}
    </span>
  );
}
