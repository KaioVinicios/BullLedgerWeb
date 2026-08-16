import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectField } from "@/forms/SelectField";
import {
  ARCHETYPES,
  TARGET_SCOPES,
  type Archetype,
  type TargetScope,
} from "@/schemas/apiEnums";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";

/**
 * Where a target applies: the level, then the coordinates that level needs.
 *
 * Extracted from `TargetForm` because that file was doing scope choice, the
 * ladder, the floor, and the submit in one place, and this is the part with
 * the most explaining to do.
 *
 * **Each option carries the list screen's own words.** The hints come from
 * `targets.levelHint.*`, the same strings the list renders under each section
 * heading — so the reader meets the hierarchy in one vocabulary wherever they
 * meet it, and a rewrite there cannot leave this screen behind.
 *
 * Those hints are wired as `aria-describedby` rather than left as loose text
 * beside the control. A radio named "An asset in one account" and described
 * "Wins over the other two" announces both, in that order, and the precedence
 * rule — the one thing a reader cannot infer from the label — is exactly what
 * a screen reader would otherwise never hear.
 *
 * No `<fieldset>` around the radios: Radix's `RadioGroup` already renders
 * `role="radiogroup"`, so a fieldset would nest a second group naming itself
 * off the same text and be announced twice. Settled on the profile screen.
 *
 * **The archetype gloss lives in the open list, not on the closed trigger.**
 * "NAV fund" is a category name and "funds priced by net asset value" is what
 * it means, and the reader needs that while *comparing* options. But
 * `SelectField` renders `<SelectValue />`, which echoes the chosen item's own
 * children, and `SelectTrigger` is a fixed `h-9` row of `whitespace-nowrap`
 * text: a stacked two-line option does not make that trigger taller, it
 * overflows it. So the gloss hides itself when it finds itself inside the
 * value slot. The alternative was widening the shared trigger, which every
 * form in the app renders — a page-local sentence is not worth that.
 *
 * **An empty list says why it is empty.** A fresh account reaches this screen
 * with no accounts and no assets, and a select with nothing in it explains
 * nothing. It is said in two halves, neither repeating the other: the trigger
 * carries the state ("No accounts yet") because that is where the reader looks
 * for a value, and the hint carries the recovery ("Add an account first.")
 * because that is the part worth a full sentence. Neither is inside the list,
 * which the reader would have to open to find empty — and `SelectField` no
 * longer lets it open at all.
 */
export function ScopeField({
  scope,
  onScopeChange,
  account,
  onAccountChange,
  asset,
  onAssetChange,
  archetype,
  onArchetypeChange,
  accounts,
  assets,
  errors,
}: {
  scope: TargetScope;
  onScopeChange: (scope: TargetScope) => void;
  account: string;
  onAccountChange: (account: string) => void;
  asset: string;
  onAssetChange: (asset: string) => void;
  archetype: Archetype;
  onArchetypeChange: (archetype: Archetype) => void;
  accounts: Account[];
  assets: Asset[];
  errors: { account?: unknown[]; asset?: unknown[]; archetype?: unknown[] };
}) {
  const { t } = useTranslation("app");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <span id="target-scope-label" className="text-sm font-medium">
          {t("targets.form.scopeLegend")}
        </span>
        <RadioGroup
          aria-labelledby="target-scope-label"
          value={scope}
          onValueChange={(value) => onScopeChange(value as TargetScope)}
        >
          {TARGET_SCOPES.map((option) => (
            <div key={option} className="flex items-start gap-3">
              <RadioGroupItem
                value={option}
                id={`scope-${option}`}
                aria-describedby={`scope-${option}-hint`}
              />
              <div className="space-y-1">
                <Label htmlFor={`scope-${option}`} className="font-normal">
                  {t(`enums.targetScope.${option}`)}
                </Label>
                <p
                  id={`scope-${option}-hint`}
                  className="max-w-prose text-xs text-muted-foreground"
                >
                  {t(`targets.levelHint.${option}`)}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-6">
        {scope !== "PORTFOLIO_ARCHETYPE" && (
          <SelectField
            name="account"
            label={t("targets.form.account")}
            value={account}
            options={accounts.map((row) => row.id)}
            renderOption={(id) =>
              accounts.find((row) => row.id === id)?.name ?? id
            }
            emptyLabel={t("targets.form.accountEmpty")}
            hint={
              accounts.length === 0 ? t("targets.form.noAccounts") : undefined
            }
            onChange={onAccountChange}
            errors={errors.account ?? []}
          />
        )}

        {scope === "HOLDING" && (
          <SelectField
            name="asset"
            label={t("targets.form.asset")}
            value={asset}
            options={assets.map((row) => row.id)}
            renderOption={(id) =>
              assets.find((row) => row.id === id)?.name ?? id
            }
            emptyLabel={t("targets.form.assetEmpty")}
            hint={assets.length === 0 ? t("targets.form.noAssets") : undefined}
            onChange={onAssetChange}
            errors={errors.asset ?? []}
          />
        )}

        {scope !== "HOLDING" && (
          <SelectField
            name="archetype"
            label={t("targets.form.archetype")}
            value={archetype}
            options={ARCHETYPES}
            renderOption={(option: Archetype) => (
              <span className="flex flex-col items-start">
                <span>{t(`enums.archetype.${option}`)}</span>
                {/*
                  Hidden wherever it is rendered inside the trigger's value
                  slot, which is the same element tree Radix clones the chosen
                  item into. See the note above: the trigger is one fixed-height
                  line, and this sentence belongs to choosing, not to the
                  choice.
                */}
                <span className="text-xs text-muted-foreground [[data-slot=select-value]_&]:hidden">
                  {t(`targets.form.archetypeGloss.${option}`)}
                </span>
              </span>
            )}
            onChange={onArchetypeChange}
            errors={errors.archetype ?? []}
          />
        )}
      </div>
    </div>
  );
}
