import Big from "big.js";
import { useTranslation } from "react-i18next";

import { signedTone } from "@/components/signedTone";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/utils/decimal";

interface SignedPercentProps {
  /** A decimal-string fraction as the API sends it: `0.1375` means 13.75%. */
  value: string;
  /** See `MoneyValue`: an override, not a requirement. */
  locale?: string;
  className?: string;
}

/**
 * A return that moved: the percentage twin of `SignedFigure`.
 *
 * `PercentValue` renders a rate; this renders a rate that has a *direction*,
 * and the two are different jobs — a weight of 13.75% is neither up nor down,
 * while a return of 13.75% is. Both keep the value a decimal string end to end.
 *
 * The sign comes from Big rather than `Number`, because the direction of a rate
 * carried to eight places must not depend on a float's opinion of it. The
 * magnitude is formatted and the sign is owned here, so `+` and `-` are
 * symmetrical and neither depends on where a locale's formatter puts its own.
 *
 * See `signedTone.ts` for why three signals carry the direction and colour is
 * the weakest of them.
 */
export function SignedPercent({
  value,
  locale,
  className,
}: SignedPercentProps) {
  const { t } = useTranslation();
  const activeLocale = useFormatLocale();

  const amount = new Big(value);
  const { sign, tone, labelKey } = signedTone(amount.cmp(0));

  const magnitude = formatPercent(
    amount.abs().toFixed(),
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
