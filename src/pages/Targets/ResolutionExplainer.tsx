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
 * **The table of contents is optional; the lesson is not.** The list page
 * replaces all three sections with a single error or empty state, and on those
 * two screens the anchors point at ids that do not exist — a link that looks
 * like navigation and does nothing, which is worse than plain text for
 * everyone and worst in the links rotor. The explainer still renders there, on
 * purpose: it is the only thing on an empty targets screen that says what the
 * three levels are *for*, and moving it inside the branch that draws them
 * would take the lesson away from the reader with the least else to read. So
 * `linked` drops the affordance and keeps the lesson.
 *
 * Counts come from the loaded arrays, so they agree with the archived toggle
 * rather than reporting a different population than the sections below.
 */
export function ResolutionExplainer({
  counts,
  linked,
}: {
  /** `null` while the load is in flight, and after one that failed. */
  counts: Record<TargetScope, number | null>;
  /** Whether the three sections this indexes are on the page to be reached. */
  linked: boolean;
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

      {/*
       * `role="list"` on an element that is already a list, on purpose:
       * Tailwind's preflight sets `list-style: none`, and Safari/VoiceOver
       * drop list semantics when it is off — taking "1 of 3", and therefore
       * the rule, with them. Restating the role restores it.
       */}
      <ol role="list" className="space-y-1 text-sm">
        {TARGET_SCOPES.map((scope, index) => {
          const count = counts[scope];

          return (
            <li key={scope} className="flex items-baseline gap-3">
              {/*
               * Spelled out rather than left to a list marker, so the order
               * survives on screen even where the marker is styled off.
               */}
              <span className="w-4 shrink-0 text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              {linked ? (
                <a
                  href={`#targets-${scope}`}
                  className="flex-1 hover:underline"
                >
                  {t(`enums.targetScope.${scope}`)}
                </a>
              ) : (
                <span className="flex-1">
                  {t(`enums.targetScope.${scope}`)}
                </span>
              )}
              {/*
               * The figures read as one series per level because they are
               * right-aligned in a `tabular-nums` column — a relationship
               * carried entirely by presentation, which WCAG 1.3.1 says must
               * also exist in text. So the digit is hidden from the
               * accessibility tree and a labelled twin carries the unit.
               *
               * `count === null`, not a falsy check: a level with no targets
               * is a fact the screen knows and states. `null` is the screen
               * not knowing — the load still in flight, or the load that
               * failed.
               */}
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {count === null ? (
                  t("targets.resolution.unknown")
                ) : (
                  <>
                    <span aria-hidden>{count}</span>
                    <span className="sr-only">
                      {t("targets.resolution.count", { count })}
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
