import { useId } from "react";
import { useTranslation } from "react-i18next";

import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoldingRow } from "@/components/HoldingRow";
import type { Asset } from "@/services/assets";
import type { AccountGroup, MissingFigure } from "@/services/portfolio";
import { isOpenPosition } from "@/utils/holdings";

/**
 * One account's block: its cash, its subtotal, and the holdings that make it up.
 *
 * Grouped because it mirrors how the payload arrives and how people think about
 * where money sits, and because it keeps an account's `cash` beside the rows it
 * totals.
 *
 * Always expanded. The collapse existed because General listed every account
 * at once; a tab shows one, and there is nothing to collapse away from.
 *
 * The rows are the positions still **held**, while `subtotal` is the server's.
 * The payload carries a row for every asset the account has ever touched, so a
 * holding sold in full arrives reading zero, and listing it would answer "what
 * have I ever owned" on a screen that asks what you own. The two still
 * reconcile: a closed row contributed nothing to the subtotal it is hidden
 * from.
 *
 * The body is a real `<table>`, so a screen reader gets row and column context
 * for free.
 */
export function AccountGroupBlock({
  group,
  name,
  assets,
  missing,
}: {
  group: AccountGroup;
  name: string;
  assets: readonly Asset[];
  missing: readonly MissingFigure[];
}) {
  const { t } = useTranslation("app");
  const titleId = useId();

  const held = group.holdings.filter(isOpenPosition);

  const assetById = (id: string) => assets.find((row) => row.id === id);

  const reasonFor = (assetId: string) =>
    missing.find(
      (row) => row.account === group.account && row.asset === assetId,
    )?.reason ?? null;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span id={titleId} className="font-medium">
            {name}
          </span>
          {!group.complete && (
            <span className="inline-flex items-center gap-0.5 text-xs font-normal text-muted-foreground">
              {t("overview.groupIncomplete")}
              <InfoHint metric="account.complete" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          {group.cash && (
            <span className="text-muted-foreground">
              {t("overview.cash")}
              <InfoHint metric="account.cash" />{" "}
              <MoneyValue value={group.cash} className="text-foreground" />
            </span>
          )}
          <MoneyValue value={group.subtotal} className="font-medium" />
        </div>
      </div>

      {held.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("overview.columns.asset")}</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("overview.columns.quantity")}
                    <InfoHint metric="holding.quantity" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("overview.columns.value")}
                    <InfoHint metric="holding.current_value" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("overview.columns.return")}
                    <InfoHint metric="holding.total_return" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("overview.columns.status")}
                    <InfoHint metric="target.status" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {held.map((holding) => (
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
      )}
    </section>
  );
}
