/**
 * Which assets actually paid, by what the scope has sold.
 *
 * The metric is realized: an asset never sold appears in neither list, however
 * well it has done. That follows from the API's definition and is stated in the
 * section's own copy rather than left for the reader to infer from an absence.
 *
 * **Every row carries its sale count and average holding period beside the
 * rate, and that is a requirement.** The API deliberately applies no minimum
 * holding period, so a position sold three days after purchase reports about
 * 50% a month — arithmetically right, and misleading with nothing beside it.
 * Rendered as "50%/mo · 1 sale · 3 days" it is neither.
 *
 * The worst list is withheld when `ranked_assets_count` is at most the number
 * of rows requested: two lists over four assets would print the same asset
 * twice and invite the reader to believe it is both the best and the worst.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedPercent } from "@/components/SignedPercent";
import {
  performanceQuery,
  type AssetPerformanceRow,
} from "@/services/portfolio";

/** The server's own default; the client sends no `limit`. */
const LIMIT = 3;

export function Ranking({ accountId }: { accountId: string | undefined }) {
  const { t } = useTranslation("app");
  const { data } = useQuery(performanceQuery(accountId));

  if (!data) return null;

  if (data.ranked_assets_count === 0) {
    return (
      <section aria-labelledby="overview-ranking" className="space-y-2">
        <h2 id="overview-ranking" className="text-sm font-medium">
          {t("overview.ranking.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("overview.ranking.empty")}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="overview-ranking" className="space-y-4">
      <h2 id="overview-ranking" className="text-sm font-medium">
        {t("overview.ranking.title")}
      </h2>
      <p className="text-xs text-muted-foreground">
        {t("overview.ranking.realizedOnly")}
      </p>

      <RankList label={t("overview.ranking.best")} rows={data.best} />
      {data.ranked_assets_count > LIMIT && (
        <RankList label={t("overview.ranking.worst")} rows={data.worst} />
      )}
    </section>
  );
}

function RankList({
  label,
  rows,
}: {
  label: string;
  rows: readonly AssetPerformanceRow[];
}) {
  const { t } = useTranslation("app");

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.asset.id}
            aria-label={row.asset.name}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          >
            <span className="font-medium">{row.asset.name}</span>
            <span className="flex items-baseline gap-3 tabular-nums">
              <SignedPercent value={row.monthly_profit_rate} />
              <span className="text-xs text-muted-foreground">
                {t("overview.ranking.context", {
                  sales: row.sales_count,
                  days: row.avg_holding_period_days,
                })}
              </span>
              <MoneyValue
                value={row.profit}
                className="text-muted-foreground"
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
