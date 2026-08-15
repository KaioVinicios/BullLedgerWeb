/**
 * What a tab shows, parameterized by scope.
 *
 * General and an account tab are the same blocks over a different scope, so
 * this is one component with an optional `accountId` rather than a pair that
 * would drift the moment one gained a block.
 *
 * The blocks read in the order the questions are asked: what it is worth, how
 * it got here and where it points, what paid, where the money sits, and — on
 * an account tab only — what that account actually holds.
 *
 * The account's holding rows come from the overview response already cached,
 * filtered to the one group — `GET /api/portfolio/overview/` is unpaginated
 * and carries every account's rows, so an account tab costs no extra request.
 * The same move `/app/holdings` makes.
 */
import { AccountGroupBlock } from "@/pages/Overview/AccountGroup";
import { AssetAllocation } from "@/pages/Overview/AssetAllocation";
import { Evolution } from "@/pages/Overview/Evolution";
import { Ranking } from "@/pages/Overview/Ranking";
import { Totals } from "@/pages/Overview/Totals";
import type { Asset } from "@/services/assets";
import type { PortfolioOverview } from "@/services/portfolio";

export function ScopeContent({
  accountId,
  overview,
  assets,
  accountName,
}: {
  accountId: string | undefined;
  overview: PortfolioOverview;
  assets: readonly Asset[];
  accountName: string;
}) {
  const group = accountId
    ? overview.accounts.find((row) => row.account === accountId)
    : undefined;

  return (
    <div className="space-y-10">
      <Totals overview={overview} group={group} />

      <Evolution accountId={accountId} />

      <Ranking accountId={accountId} />

      <AssetAllocation accountId={accountId} />

      {/* No heading above this: the block is its own labelled region, titled
          with the account, and it only ever appears on that account's tab. A
          wrapper reading "What Corretora holds" over a card reading
          "Corretora" said the name three times on one screen, and nested two
          regions whose accessible names differed only by the sentence around
          them. */}
      {group && (
        <AccountGroupBlock
          group={group}
          name={accountName}
          assets={assets}
          missing={overview.missing}
        />
      )}
    </div>
  );
}
