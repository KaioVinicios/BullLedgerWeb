import { useFormatLocale } from "@/hooks/useFormatLocale";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/utils/decimal";

interface PercentValueProps {
  /** A decimal-string fraction as the API sends it: `0.1375` means 13.75%. */
  value: string;
  /** See `MoneyValue`: an override, not a requirement. */
  locale?: string;
  className?: string;
}

/**
 * A rate or weight, rendered as a percentage.
 *
 * The value stays a decimal string end to end; the ×100 runs through big.js,
 * so a weight carried to eight places does not lose its tail on the way to
 * the screen.
 */
export function PercentValue({ value, locale, className }: PercentValueProps) {
  const activeLocale = useFormatLocale();

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatPercent(value, locale ?? activeLocale)}
    </span>
  );
}
