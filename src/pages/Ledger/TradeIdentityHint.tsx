/**
 * `Money = round(Quantity × UnitPrice)`, as a sentence.
 *
 * Phase 1 built `matchesTradeIdentity` as a pure predicate and left the
 * presentation to this phase deliberately. It is a **hint and never a gate**,
 * for two reasons that both survive review: the server is authoritative on
 * rounding, and a real trade can miss the identity for causes this form cannot
 * see — a partial fill averaged by the broker, a price quoted to more places
 * than the statement prints.
 *
 * The fee is why the comparison is not simply against the amount. The server
 * stores `fee` as a positive magnitude *already folded into* `cash_delta`, so
 * the trade's gross value is what is left after removing it — in the direction
 * the cash moved. `grossMinorUnits` owns that arithmetic; this only phrases it.
 */
import { useTranslation } from "react-i18next";
import { IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import type { MovementShape } from "@/schemas/movementSpec";
import { formatDecimal, SCALE } from "@/utils/decimal";
import {
  formatMoney,
  formatUnitPrice,
  parseMoneyInput,
  type Currency,
} from "@/utils/money";
import { grossMinorUnits } from "@/utils/movementWire";
import { expectedCashMinorUnits } from "@/utils/trade";

type TradeIdentityHintProps = {
  quantity: string;
  unitPrice: string;
  amount: string;
  fee: string;
  currency: Currency;
  cashRule: MovementShape["cash"];
  locale: string;
};

export function TradeIdentityHint({
  quantity,
  unitPrice,
  amount,
  fee,
  currency,
  cashRule,
  locale,
}: TradeIdentityHintProps) {
  const { t } = useTranslation("app");

  if (!quantity.trim() || !unitPrice.trim() || !amount.trim()) return null;

  const settled = parseMoneyInput(amount, currency, locale);
  if (!settled) return null;
  const parsedFee = fee.trim() ? parseMoneyInput(fee, currency, locale) : null;

  let expected: number;
  try {
    expected = expectedCashMinorUnits(quantity, unitPrice);
  } catch {
    // Either value can be mid-typing and not yet a number; say nothing rather
    // than accuse the user of an error they are in the middle of not making.
    return null;
  }

  const gross = grossMinorUnits(settled, parsedFee, cashRule);
  const matches = Math.abs(expected) === Math.abs(gross);

  const values = {
    quantity: formatDecimal(quantity, locale, SCALE.quantity),
    price: formatUnitPrice(unitPrice, currency, locale),
    gross: formatMoney({ amount: Math.abs(expected), currency }, locale),
  };

  return (
    <p
      // Polite rather than assertive: it recalculates on every keystroke, and
      // an interruption per character would make the field unusable.
      aria-live="polite"
      className={cn(
        "flex items-start gap-1.5 text-xs",
        matches ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {!matches && (
        <IconAlertTriangle
          className="mt-px size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
      <span className="tabular-nums">
        {matches
          ? t("ledger.form.identityMatch", values)
          : t("ledger.form.identityMismatch", values)}
      </span>
    </p>
  );
}
