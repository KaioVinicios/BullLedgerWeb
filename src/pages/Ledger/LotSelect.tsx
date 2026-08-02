/**
 * Which contribution an exit draws from — a required field on `SELL`,
 * `REDEMPTION`, `WITHDRAWAL`, and `TRANSFER_OUT`, and a 400 if it is wrong.
 *
 * The options come from the **holding projection**, not from `GET /api/lots/`.
 * The lot list knows a label and nothing else; the projection knows each lot's
 * `status` and how much of it remains, which is the difference between offering
 * a choice and offering an informed one. It also lets the client refuse an
 * overdraw before sending it, instead of translating `movement_lot_overdrawn`
 * after the fact.
 *
 * The projection can legitimately be unavailable — a holding with no price
 * still has lots. When it is, this falls back to the flat list, keeps working,
 * and stops pre-checking: the server enforces the rule either way, and a picker
 * that renders nothing would be worse than one that checks less.
 *
 * The overdraw check itself lives in the form's own validator rather than here,
 * because only the validator can stop a submit. Both read the same cached
 * projection, so there is one fetch and one message.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/forms/FieldError";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { listLots, lotKeys } from "@/services/lots";
import { holdingQuery, type LotProjection } from "@/services/portfolio";
import { formatDecimal, SCALE } from "@/utils/decimal";
import { formatMoney } from "@/utils/money";

type LotSelectProps = {
  /** Distinguishes this picker's ids where two live on one screen. */
  name?: string;
  accountId: string;
  assetId: string;
  value: string;
  onChange: (value: string) => void;
  errors: unknown[];
  /**
   * Whether the holding is counted in units or in principal. It decides which
   * of a lot's two remainders is the one worth showing.
   */
  isUnitBased: boolean;
};

/**
 * What is left of a contribution, in whichever figure the holding keeps.
 *
 * The caller says which it expects, but the projection has the last word: a
 * lump-principal position carries no `quantity_remaining` and a unit-based one
 * carries no principal, so asking for the wrong figure falls through to the
 * one that exists rather than to nothing.
 */
function remainingOf(
  lot: LotProjection,
  isUnitBased: boolean,
  locale: string,
): string | null {
  const units = lot.quantity_remaining;
  const principal = lot.principal_remaining;

  if (isUnitBased && units !== null) {
    return formatDecimal(units, locale, SCALE.quantity);
  }
  if (principal !== null) return formatMoney(principal.native, locale);
  if (units !== null) return formatDecimal(units, locale, SCALE.quantity);

  return null;
}

export function LotSelect({
  name = "movement-lot",
  accountId,
  assetId,
  value,
  onChange,
  errors,
  isUnitBased,
}: LotSelectProps) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const scoped = Boolean(accountId && assetId);

  const holding = useQuery({
    ...holdingQuery(accountId, assetId),
    enabled: scoped,
  });

  // Only reached when the projection has actually failed — a pending one is
  // not a fallback, and firing this alongside it would double every request.
  const lots = useQuery({
    queryKey: lotKeys.list({ account: accountId, asset: assetId }),
    queryFn: () => listLots({ account: accountId, asset: assetId }),
    enabled: scoped && holding.isError,
  });

  const projected = holding.data?.lots.filter((lot) => lot.status === "OPEN");

  const options =
    projected?.map((lot) => {
      const remaining = remainingOf(lot, isUnitBased, locale);

      return {
        id: lot.lot,
        label: remaining
          ? t("ledger.form.lotRemaining", { label: lot.label, remaining })
          : lot.label,
      };
    }) ??
    lots.data?.results.map((lot) => ({
      id: lot.id,
      label: lot.label ?? "",
    })) ??
    [];

  const settled = holding.isSuccess || lots.isSuccess || lots.isError;
  const nothingToDrawFrom = settled && options.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{t("ledger.form.lot")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue placeholder={t("ledger.form.lotPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${name}-hint`} className="text-xs text-muted-foreground">
        {/*
          Said in the resting hint rather than inside the list, because the
          answer is that this exit cannot be recorded at all — which the user
          should not have to open a dropdown to discover.
        */}
        {nothingToDrawFrom
          ? t("ledger.form.lotEmpty")
          : t("ledger.form.lotHint")}
      </p>
      <FieldError id={`${name}-error`} errors={errors} />
    </div>
  );
}
