/**
 * The sales history filter bar.
 *
 * Filters are a first-class requirement here, not decoration: "my losing
 * sales in 2026" or "everything I sold from this account" are the questions
 * this screen exists to answer, and neither is answerable without them.
 *
 * This component owns no navigation of its own. It reads `search` and calls
 * `onChange` with a *partial* update — never the whole shape — so the page
 * (`index.tsx`) is free to merge that into the previous search with
 * `{ ...prev, ...next }`. Changing one control must never clear another; that
 * contract lives here, in every `onChange` handler calling `onChange` with
 * only the one field it owns.
 *
 * `account` and `asset` options come from the same live-rows queries
 * `Ledger/index.tsx` and `Ledger/Lots.tsx` already run — an archived account
 * or asset takes no new sales, so there is nothing to filter by there.
 *
 * The "clear" button is judged by the same fields as the filters themselves:
 * `ordering` is a sort preference, not something that excludes a row, so it
 * neither counts toward "a filter is set" nor gets reset when the button is
 * pressed.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ARCHETYPES, type Archetype } from "@/schemas/apiEnums";
import {
  salesDefaults,
  SALES_ORDERINGS,
  SALES_RESULTS,
  type SalesSearch,
} from "@/schemas/portfolioView";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { toCalendarDate } from "@/utils/date";
import { accountLabel } from "@/utils/accountLabel";

/** Radix select values are strings; "no filter" needs one of its own. */
const ALL = "all";

/** Only live rows: an archived account or asset takes no new sales. */
const LIVE = {} as const;

export function SalesFilters({
  search,
  onChange,
}: {
  search: SalesSearch;
  onChange: (next: Partial<SalesSearch>) => void;
}) {
  const { t } = useTranslation("app");

  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  // `ordering` is excluded on purpose: it reorders rows, it never excludes
  // one, so it is not a "filter" in the sense this button clears.
  const isFiltered =
    search.account !== undefined ||
    search.asset !== undefined ||
    search.archetype !== undefined ||
    search.sold_from !== undefined ||
    search.sold_to !== undefined ||
    search.result !== undefined ||
    search.include_archived !== undefined;

  const clearFilters = () =>
    onChange({
      account: undefined,
      asset: undefined,
      archetype: undefined,
      sold_from: undefined,
      sold_to: undefined,
      result: undefined,
      include_archived: undefined,
    });

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterSelect
        id="sales-account"
        label={t("sales.filters.account")}
        value={search.account}
        onChange={(account) => onChange({ account })}
        allLabel={t("sales.filters.all")}
        options={(accounts?.results ?? []).map((row) => ({
          value: row.id,
          label: accountLabel(row, t),
        }))}
      />
      <FilterSelect
        id="sales-asset"
        label={t("sales.filters.asset")}
        value={search.asset}
        onChange={(asset) => onChange({ asset })}
        allLabel={t("sales.filters.all")}
        options={(assets?.results ?? []).map((row) => ({
          value: row.id,
          label: row.name,
        }))}
      />
      <FilterSelect
        id="sales-archetype"
        label={t("sales.filters.archetype")}
        value={search.archetype}
        onChange={(archetype) =>
          onChange({ archetype: archetype as Archetype })
        }
        allLabel={t("sales.filters.all")}
        options={ARCHETYPES.map((archetype) => ({
          value: archetype,
          label: t(`enums.archetype.${archetype}`),
        }))}
      />

      <div className="space-y-2">
        <Label htmlFor="sales-sold-from" className="font-normal">
          {t("sales.filters.soldFrom")}
        </Label>
        <Input
          id="sales-sold-from"
          type="date"
          className="w-40"
          value={search.sold_from ?? ""}
          // A half-typed date is not a date: only a complete, valid one
          // reaches `onChange`, the same check the URL schema itself applies.
          onChange={(event) =>
            onChange({
              sold_from: toCalendarDate(event.target.value) ?? undefined,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sales-sold-to" className="font-normal">
          {t("sales.filters.soldTo")}
        </Label>
        <Input
          id="sales-sold-to"
          type="date"
          className="w-40"
          value={search.sold_to ?? ""}
          onChange={(event) =>
            onChange({
              sold_to: toCalendarDate(event.target.value) ?? undefined,
            })
          }
        />
      </div>

      <FilterSelect
        id="sales-result"
        label={t("sales.filters.result")}
        value={search.result}
        onChange={(result) =>
          onChange({ result: result as SalesSearch["result"] })
        }
        allLabel={t("sales.filters.all")}
        options={SALES_RESULTS.map((result) => ({
          value: result,
          label: t(`sales.result.${result}`),
        }))}
      />

      <div className="space-y-2">
        <Label htmlFor="sales-ordering" className="font-normal">
          {t("sales.filters.ordering")}
        </Label>
        <Select
          value={search.ordering ?? salesDefaults.ordering}
          onValueChange={(value) =>
            onChange({ ordering: value as SalesSearch["ordering"] })
          }
        >
          <SelectTrigger id="sales-ordering" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_ORDERINGS.map((ordering) => (
              <SelectItem key={ordering} value={ordering}>
                {t(`sales.ordering.${ordering}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="sales-include-archived"
          checked={search.include_archived ?? false}
          onCheckedChange={(checked) =>
            onChange({ include_archived: checked || undefined })
          }
        />
        <Label htmlFor="sales-include-archived" className="font-normal">
          {t("sales.filters.includeArchived")}
        </Label>
      </div>

      {isFiltered && (
        <Button variant="outline" onClick={clearFilters}>
          {t("sales.filters.clear")}
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
      >
        <SelectTrigger id={id} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
