import { useId } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { HoldingRow } from "@/components/HoldingRow";
import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Asset } from "@/services/assets";
import type { MissingFigure } from "@/services/portfolio";
import type { CustodyAccountGroup } from "@/utils/holdings";

/**
 * One account inside an institution: what is in it, and what that comes to.
 *
 * The cash row is not decoration. `subtotal` is the server's and already counts
 * free cash, so a block listing only holdings would print rows that do not add
 * up to the figure beside them — the kind of arithmetic gap that reads as
 * untrustworthy math even when every number is right.
 *
 * An account the live list does not name still renders, under a placeholder.
 * That happens when the rollup reports an archived account, and dropping it
 * would be tidier and wrong: its subtotal is part of the total above.
 *
 * `headerless` is what a single-account institution renders. The parent has
 * already merged both names into one header and owns the disclosure, so a
 * second name, a second toggle, and a repeated subtotal would all say what the
 * line above just said. The table is the whole contribution then, and it needs
 * no landmark of its own: the institution's `<section>` already names it.
 */
export function AccountBlock({
  group,
  isOpen,
  onToggle,
  assets,
  missing,
  headerless = false,
}: {
  group: CustodyAccountGroup;
  isOpen: boolean;
  onToggle: () => void;
  assets: readonly Asset[];
  missing: readonly MissingFigure[];
  headerless?: boolean;
}) {
  const { t } = useTranslation("app");
  const titleId = useId();
  const bodyId = useId();

  const name = group.account?.name ?? t("holdings.unknownAccount");
  const assetById = (id: string) => assets.find((row) => row.id === id);
  const reasonFor = (assetId: string) =>
    missing.find(
      (row) => row.account === group.accountId && row.asset === assetId,
    )?.reason ?? null;

  const table = group.holdings.length > 0 && (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("holdings.columns.asset")}</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-0.5">
                {t("holdings.columns.quantity")}
                <InfoHint metric="holding.quantity" />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-0.5">
                {t("holdings.columns.value")}
                <InfoHint metric="holding.current_value" />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-0.5">
                {t("holdings.columns.return")}
                <InfoHint metric="holding.total_return" />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-0.5">
                {t("holdings.columns.status")}
                <InfoHint metric="target.status" />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.holdings.map((holding) => (
            <HoldingRow
              key={holding.asset}
              holding={holding}
              asset={assetById(holding.asset)}
              reason={reasonFor(holding.asset)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (headerless) return table || null;

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {isOpen ? (
            <IconChevronDown aria-hidden className="size-4 shrink-0" />
          ) : (
            <IconChevronRight aria-hidden className="size-4 shrink-0" />
          )}
          <span id={titleId} className="text-sm font-medium">
            {name}
          </span>
          {!group.complete && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("holdings.groupIncomplete")}
            </span>
          )}
        </button>

        <div className="flex items-center gap-6 text-sm">
          {group.cash && (
            <span className="text-muted-foreground">
              {t("holdings.cash")}{" "}
              <MoneyValue value={group.cash} className="text-foreground" />
            </span>
          )}
          <MoneyValue value={group.subtotal} className="font-medium" />
        </div>
      </div>

      <div id={bodyId} hidden={!isOpen}>
        {table}
      </div>
    </section>
  );
}
