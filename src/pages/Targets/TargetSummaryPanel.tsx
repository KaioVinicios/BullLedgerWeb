import { useTranslation } from "react-i18next";

import { TargetSentence } from "@/components/TargetSentence";
import type { TargetClauses } from "@/utils/targetSentence";

/**
 * What the form currently says, in the words the rest of the app will use to
 * say it back.
 *
 * It sticks while the fields scroll, because a summary that leaves the
 * viewport as soon as the ladder gets long is a summary nobody reads at the
 * moment they need it.
 *
 * **On narrow screens it stacks below the form's actions, not above them**, and
 * that is a decision rather than a leftover. The submit controls belong in the
 * card's own footer, attached to the fields they send — the pattern every other
 * form in this app uses, and the one a reader already knows. Lifting the
 * actions out of the card to slot this panel in front of them would buy a
 * better mobile reading order at the cost of the convention on the primary
 * platform, which `PRODUCT.md` names as desktop. So on `lg` and up — where this
 * screen is actually used, and where the panel is sticky beside the fields the
 * whole time — the summary is read *while* authoring; below `lg` it degrades
 * honestly into a closing recap rather than pretending to be a gate.
 *
 * The closing line is `BR-SCOPE`: BullLedger derives and displays a verdict and
 * does nothing else. It is stated exactly once, here, at the point where a
 * user is deciding what a target should do.
 */
export function TargetSummaryPanel({ clauses }: { clauses: TargetClauses }) {
  const { t } = useTranslation("app");

  return (
    <aside
      aria-labelledby="target-summary-title"
      className="space-y-3 rounded-xl border bg-muted/40 p-4 lg:sticky lg:top-6"
    >
      <h2
        id="target-summary-title"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {t("targets.form.summaryTitle")}
      </h2>

      <TargetSentence clauses={clauses} layout="stacked" />

      <p className="border-t pt-3 text-xs text-muted-foreground">
        {t("targets.form.reportsOnly")}
      </p>
    </aside>
  );
}
