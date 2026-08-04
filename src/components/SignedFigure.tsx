import { useTranslation } from "react-i18next";

import { signedTone } from "@/components/signedTone";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { cn } from "@/lib/utils";
import { formatMoney, type Money } from "@/utils/money";

interface SignedFigureProps {
  value: Money;
  /** See `MoneyValue`: an override, not a requirement. */
  locale?: string;
  className?: string;
}

/**
 * An amount that moved: a gain, a loss, or neither.
 *
 * The percentage twin is `SignedPercent`; both read their direction from
 * `signedTone`, which is where the three-signals rule and its reasoning live.
 */
export function SignedFigure({ value, locale, className }: SignedFigureProps) {
  const { t } = useTranslation();
  const activeLocale = useFormatLocale();

  const { amount, currency } = value;
  const { sign, tone, labelKey } = signedTone(Math.sign(amount));

  // Format the magnitude and own the sign, so `+` and `-` are symmetrical
  // and neither depends on what a locale's formatter chooses to emit.
  const magnitude = formatMoney(
    { amount: Math.abs(amount), currency },
    locale ?? activeLocale,
  );

  return (
    <span className={cn("font-mono tabular-nums", tone, className)}>
      {sign}
      {magnitude}
      {labelKey && <span className="sr-only"> {t(labelKey)}</span>}
    </span>
  );
}
