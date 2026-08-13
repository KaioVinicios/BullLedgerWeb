import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PercentField } from "@/forms/PercentField";
import { SelectField } from "@/forms/SelectField";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PERIODS, type Period } from "@/schemas/apiEnums";
import { describeDraft } from "@/utils/targetSentence";

/**
 * The optional floor: a switch, a magnitude, and a period.
 *
 * **Displayed signed, stored unsigned.** `loss_limit_pct` reaches the wire as
 * a positive magnitude — a negative is rejected with
 * `target_loss_limit_positive` — but a bare `3%` beside a rate of `3%` reads as
 * the same kind of number, and one of them is a loss. So the field carries a
 * printed `−` the way a money field carries its currency: part of the reading,
 * never part of the typing. **No sign is flipped anywhere on this path**, and
 * `targetWire.ts` stays untouched.
 *
 * That `−` is `aria-hidden`, because the input's value really is `3,00` and
 * announcing a sign it does not contain would be a lie. The reading it carries
 * reaches assistive tech through the hint instead, which echoes the same
 * sentence the summary panel shows and which `TextField` wires into
 * `aria-describedby`. Both channels say the same thing; neither invents a
 * value.
 *
 * Controlled, and outside TanStack Form for the reason `StepsEditor` is: the
 * component is testable with no form mounted, and every input is named with
 * the server's key verbatim so a rejection lands on the right field.
 */
export function FloorField({
  enabled,
  onEnabledChange,
  pct,
  onPctChange,
  period,
  onPeriodChange,
  errors,
  periodErrors = [],
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  pct: string;
  onPctChange: (pct: string) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  errors: unknown[];
  periodErrors?: unknown[];
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  // The floor clause only; the scope and ladder handed in here are inert
  // placeholders `describeDraft` needs and this field never shows. Going
  // through it rather than formatting the rate here is the point: the hint and
  // the summary panel then say the sentence the same way, from one function.
  const floor = describeDraft(
    {
      scope: "PORTFOLIO_ARCHETYPE",
      account: "",
      asset: "",
      archetype: "CRYPTO",
      steps: [],
      floorEnabled: true,
      loss_limit_pct: pct,
      loss_limit_period: period,
    },
    { names: { accountName: (id) => id, assetName: (id) => id }, t, locale },
  ).floor;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="floor-enabled"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
        <Label htmlFor="floor-enabled" className="font-normal">
          {t("targets.form.floor.toggle")}
        </Label>
      </div>

      <p className="max-w-prose text-xs text-muted-foreground">
        {t("targets.form.floor.description")}
      </p>

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PercentField
            name="loss_limit_pct"
            label={t("targets.form.floor.rate")}
            sign="negative"
            value={pct}
            hint={
              floor
                ? t("targets.form.floor.hint", { rate: floor.rate })
                : t("targets.form.floor.hintEmpty")
            }
            onBlur={() => undefined}
            onChange={onPctChange}
            errors={errors}
          />

          <SelectField
            name="loss_limit_period"
            label={t("targets.form.floor.period")}
            value={period}
            options={PERIODS}
            renderOption={(option: Period) => t(`enums.period.${option}`)}
            onChange={onPeriodChange}
            errors={periodErrors}
          />
        </div>
      )}
    </div>
  );
}
