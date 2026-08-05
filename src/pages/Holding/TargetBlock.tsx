import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";

import { PercentValue } from "@/components/PercentValue";
import { TargetStatusBadge } from "@/components/TargetStatusBadge";
import { PATHS } from "@/routes/path";
import type { HoldingDetail } from "@/services/portfolio";

/**
 * The server's verdict on this holding, and where it came from.
 *
 * Everything here is read. `actual`, `expected`, and `band` arrive as
 * decimal-string fractions and become percentages without a division happening
 * on this side; the client never compares them and never decides a status.
 *
 * **The provenance is a statement, not a link.** `TargetSource` carries the
 * resolved target's id, so linking to it would be possible — it is not offered,
 * because this screen's premise is that it only reads, and a screen that reads
 * should not grow an edit path to the thing it is reading. The one link here
 * exists in the opposite case: when *nothing* resolved, there is no reading to
 * protect and the useful next move is to author one.
 *
 * **No target is no status.** Not an error, not a warning, not a zero — the
 * roadmap says so explicitly, and the copy carries no tone to match.
 *
 * The provenance sentence is built from `source.scope` plus what this screen
 * already holds (the account name, the archetype), so naming the level costs no
 * second request.
 */
export function TargetBlock({
  holding,
  accountName,
}: {
  holding: HoldingDetail;
  accountName: string;
}) {
  const { t } = useTranslation("app");
  const target = holding.target;

  return (
    <section
      aria-labelledby="holding-target-title"
      className="space-y-3 rounded-xl border p-4"
    >
      <h2 id="holding-target-title" className="text-sm font-medium">
        {t("holding.target.title")}
      </h2>

      {target ? (
        <>
          <TargetStatusBadge status={target.status} />

          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dd className="text-base font-medium tabular-nums">
                <PercentValue value={target.actual} />
              </dd>
              <dt className="text-xs text-muted-foreground">
                {t("holding.target.actual")}
              </dt>
            </div>
            <div>
              <dd className="text-base font-medium tabular-nums">
                <PercentValue value={target.expected} />
              </dd>
              <dt className="text-xs text-muted-foreground">
                {t("holding.target.expected")}
              </dt>
            </div>
            <div>
              {/* A band is a tolerance, not a figure that moved — so it reads
                  ± rather than signed. */}
              <dd className="text-base font-medium tabular-nums">
                ±<PercentValue value={target.band} />
              </dd>
              <dt className="text-xs text-muted-foreground">
                {t("holding.target.band")}
              </dt>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            {t(`holding.target.from.${target.source.scope}`, {
              archetype: t(`enums.archetype.${holding.archetype}`),
              account: accountName,
            })}
          </p>
        </>
      ) : (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {t("holding.target.none")}
          <Link
            to={PATHS.TARGETS_NEW}
            search={{
              scope: "HOLDING",
              account: holding.account,
              asset: holding.asset,
            }}
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
          >
            {t("holding.target.set")}
            <IconArrowRight aria-hidden className="size-3.5" />
          </Link>
        </p>
      )}
    </section>
  );
}
