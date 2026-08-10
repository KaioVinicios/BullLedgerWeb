import { AssetGroupBlock } from "@/pages/Holdings/AssetGroup";
import type { HoldingsGrain } from "@/schemas/portfolioView";
import type { MissingFigure } from "@/services/portfolio";
import type { AssetGroup } from "@/utils/holdings";

/**
 * The screen inverted: one block per asset, largest position first.
 *
 * Thin on purpose. The ordering and every consolidated figure are decided in
 * `groupByAsset`, where they can be tested without a router — this only walks
 * what it is handed and carries the collapse state down.
 */
export function AssetPivot({
  groups,
  closed,
  onToggle,
  grain,
  missing,
}: {
  groups: readonly AssetGroup[];
  closed: readonly string[];
  onToggle: (key: string) => void;
  grain: HoldingsGrain;
  missing: readonly MissingFigure[];
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <AssetGroupBlock
          key={group.assetId}
          group={group}
          isOpen={!closed.includes(group.assetId)}
          onToggle={() => onToggle(group.assetId)}
          grain={grain}
          missing={missing}
        />
      ))}
    </div>
  );
}
