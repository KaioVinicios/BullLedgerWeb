import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";

import { InfoHint } from "@/components/InfoHint";
import { PercentValue } from "@/components/PercentValue";
import { TargetStatusBadge } from "@/components/TargetStatusBadge";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { HoldingDetail } from "@/services/portfolio";
import { targetQuery } from "@/services/targets";
import { describeTarget, summarizeClauses } from "@/utils/targetSentence";

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
 * already holds (the account name, the archetype), so naming the *level* costs
 * no second request. Naming what the verdict is measured *against* does — see
 * `resolved` below.
 */
export function TargetBlock({
  holding,
  accountName,
}: {
  holding: HoldingDetail;
  accountName: string;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const target = holding.target;

  /**
   * `TargetStatusResult.source` names the winning target but does not carry
   * it — it is `{ scope, id }` — so describing the target the verdict is
   * measured against costs one read.
   *
   * It is deliberately allowed to fail, and `retry: false` says so: the
   * provenance line is the whole account this screen owes the reader, and the
   * sentence is an addition to it rather than a replacement for it. Re-sending
   * a read whose only payload is one extra clause would spend a retry budget
   * on something nothing here depends on.
   */
  const resolved = useQuery({
    ...targetQuery(target?.source.id ?? ""),
    enabled: Boolean(target),
    retry: false,
  });

  const sentence = resolved.data
    ? summarizeClauses(
        describeTarget(resolved.data, {
          // `describeTarget` calls both to build the scope clause, and
          // `summarizeClauses` then drops that clause — the provenance line
          // beside it already says where the target came from. So these are
          // invoked and their result is discarded: `ScopeNames` requires
          // them, and nothing on screen depends on what they return.
          names: { accountName: () => accountName, assetName: () => "" },
          t,
          locale,
        }),
      )
    : null;

  const provenance = target
    ? t(`holding.target.from.${target.source.scope}`, {
        archetype: t(`enums.archetype.${holding.archetype}`),
        account: accountName,
      })
    : null;

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
                <InfoHint metric="target.actual" />
              </dt>
            </div>
            <div>
              <dd className="text-base font-medium tabular-nums">
                <PercentValue value={target.expected} />
              </dd>
              <dt className="text-xs text-muted-foreground">
                {t("holding.target.expected")}
                <InfoHint metric="target.expected" />
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
                <InfoHint metric="target.band" />
              </dt>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            {sentence
              ? t("holding.target.measuredAgainst", { provenance, sentence })
              : provenance}
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
