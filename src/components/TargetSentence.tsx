import { useId } from "react";
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
 * **The rows are not a description list.** A `<dl>` was the obvious reach and
 * the wrong one: it would make `−3% monthly` the term and `floor` its
 * definition, so a screen reader announces the value before the label it
 * answers to — backwards on every row. Reversing the DOM to fix the
 * announcement would then desync reading order from visual order, trading one
 * defect for another. These rows are a figure beside its qualifier, which is
 * not a term/definition relationship at all, so they are plain elements and
 * the weight alone carries the distinction.
 *
 * **The rows name what they describe.** They are grouped and labelled by the
 * scope sentence above them, because a screen-reader user arriving at the
 * group by landmark or list navigation would otherwise hear "3% monthly, for
 * the first 3 months" with nothing saying which target that is. The id comes
 * from `useId`: the panel and the holding's block can both be on one page, and
 * a literal id would collide the moment they were.
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
  const scopeId = useId();

  if (layout === "line") {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {summarizeClauses(clauses)}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <p id={scopeId}>{clauses.scope}</p>

      {clauses.steps.length === 0 && (
        <p className="text-muted-foreground">
          {t("targets.sentence.ladderEmpty")}
        </p>
      )}

      {(clauses.steps.length > 0 || clauses.floor) && (
        <div role="group" aria-labelledby={scopeId} className="space-y-1.5">
          {clauses.steps.map((step, index) => (
            // The index, not the prose: three rungs left at the same month
            // while the ladder is still being typed produce two identical
            // `when` strings, and an identical rate beside them would collide
            // a composite key. These rows hold no state and are derived
            // wholly from the array, so position is the honest identity.
            <div
              key={index}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
            >
              <span className="font-medium tabular-nums">{step.rate}</span>
              <span className="text-muted-foreground">{step.when}</span>
            </div>
          ))}
          {clauses.floor && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium tabular-nums">
                {clauses.floor.rate}
              </span>
              <span className="text-muted-foreground">
                {t("targets.sentence.floorLabel")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
