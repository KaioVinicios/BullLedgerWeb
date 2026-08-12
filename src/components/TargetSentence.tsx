import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { summarizeClauses, type TargetClauses } from "@/utils/targetSentence";

/**
 * One target, said out loud, in the two shapes the app needs.
 *
 * `line` is the list card: the rungs and the floor joined, scope omitted
 * because the card's title already names it. `stacked` is the form's summary
 * panel and the holding's block: the scope as a sentence, then one row per
 * rung with the figure carrying the weight and the qualifier deferring to it —
 * `PRODUCT.md`'s first principle inside a sentence rather than instead of one.
 *
 * All the prose arrives pre-built from `targetSentence.ts`. This file decides
 * layout and weight and nothing else, which is what keeps the three surfaces
 * from drifting into three descriptions of the same target.
 *
 * **The figures are `tabular-nums` but not `font-mono`**, unlike `MoneyValue`
 * and its neighbours. Those set a column; this sets a sentence, and the rate
 * is "3% monthly" — a figure with a word attached, which mono would typeset as
 * a machine reading rather than as something being said.
 *
 * **An empty ladder hides the ladder, never the floor.** A draft can carry a
 * readable floor before any rung is readable, and dropping it would leave the
 * panel reporting less than it had been told — `PRODUCT.md`'s fourth
 * principle. The note names what is missing; the floor still states itself.
 */
export function TargetSentence({
  clauses,
  layout,
  className,
}: {
  clauses: TargetClauses;
  layout: "line" | "stacked";
  className?: string;
}) {
  const { t } = useTranslation("app");

  if (layout === "line") {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {summarizeClauses(clauses)}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <p>{clauses.scope}</p>

      {clauses.steps.length === 0 && (
        <p className="text-muted-foreground">
          {t("targets.sentence.ladderEmpty")}
        </p>
      )}

      {(clauses.steps.length > 0 || clauses.floor) && (
        <dl className="space-y-1.5">
          {clauses.steps.map((step) => (
            <div
              key={`${step.rate}-${step.when}`}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <dt className="font-medium tabular-nums">{step.rate}</dt>
              <dd className="text-muted-foreground">{step.when}</dd>
            </div>
          ))}
          {clauses.floor && (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-medium tabular-nums">{clauses.floor.rate}</dt>
              <dd className="text-muted-foreground">
                {t("targets.sentence.floorLabel")}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
