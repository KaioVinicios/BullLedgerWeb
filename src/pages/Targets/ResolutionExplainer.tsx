import { useTranslation } from "react-i18next";

import { TARGET_SCOPES, type TargetScope } from "@/schemas/apiEnums";

/**
 * The three-level rule, on the screen that stores it.
 *
 * `business-rules.md` resolves a holding's target most-specific-first and
 * takes the first match whole. The list already put its sections in that
 * order and left the rule to a sentence; this makes the order legible before
 * the reader has scrolled far enough to infer it.
 *
 * **A real `<ol>`, not a drawn bracket.** The order *is* the rule, and an
 * ordered list carries that in the semantics and the visuals at once — a
 * bracket would be decoration a screen reader steps over. Each row links to
 * its section, so the explainer doubles as the screen's table of contents.
 *
 * Counts come from the loaded arrays, so they agree with the archived toggle
 * rather than reporting a different population than the sections below.
 */
export function ResolutionExplainer({
  counts,
}: {
  /** `null` while the load is in flight. */
  counts: Record<TargetScope, number | null>;
}) {
  const { t } = useTranslation("app");

  return (
    <section
      aria-labelledby="targets-resolution"
      className="space-y-3 rounded-xl border bg-muted/50 p-4"
    >
      <h2 id="targets-resolution" className="text-sm font-medium">
        {t("targets.resolution.title")}
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("targets.resolution.rule")}
      </p>

      <ol className="space-y-1 text-sm">
        {TARGET_SCOPES.map((scope, index) => (
          <li key={scope} className="flex items-baseline gap-3">
            {/*
             * Spelled out rather than left to a list marker, and deliberately
             * not `aria-hidden`. The marker is styled off, and the assistive
             * technologies that drop list semantics when it is would take the
             * order down with it — and the order is the whole rule. Hearing
             * "item 1 of 3" twice costs less than not hearing it at all.
             */}
            <span className="w-4 shrink-0 text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <a href={`#targets-${scope}`} className="flex-1 hover:underline">
              {t(`enums.targetScope.${scope}`)}
            </a>
            {/*
             * `??`, not `||`: a level with no targets is a fact the screen
             * knows and prints as "0". Only the pending load is unknown.
             */}
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {counts[scope] ?? t("targets.resolution.unknown")}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
