import { useTranslation } from "react-i18next";

import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { TargetCard } from "@/pages/Targets/TargetCard";
import type { TargetScope } from "@/schemas/apiEnums";
import type { Target } from "@/services/targets";
import { slicePage } from "@/utils/slicePage";
import type { ScopeNames } from "@/utils/targetScope";

/**
 * One level of the hierarchy: its heading, what the level means, and its rows.
 *
 * It no longer owns a query. The screen loads every target once — the shadow
 * note has to compare levels the reader is not looking at — so this receives
 * the rows already in hand and cuts them with `slicePage`. Its URL page
 * parameter is unchanged: `holdingPage=2` still means the second fifty.
 *
 * Three sections rather than one list with a level column, unchanged from
 * before: the order they appear in *is* the resolution rule, and the screen
 * teaches it by shape. A section with no rows keeps its heading and its
 * explanation, because the headings are what carry the lesson.
 *
 * **The cards are a real list, and this is the file that can say so.** A
 * `TargetCard` renders a `<div>` because it cannot know how many of itself
 * exist; this section does, so it owns the `<ul>`. The table it replaced
 * announced its own size and moved cell to cell, and dropping the rows into a
 * bare stack of `<div>`s would have quietly taken both away — a screen-reader
 * user would hear four unrelated blocks where the level has four targets.
 * `role="list"` is restated for the reason `ResolutionExplainer` restates it:
 * Tailwind's preflight sets `list-style: none`, and Safari/VoiceOver drop list
 * semantics when it is off, taking the count with them.
 *
 * **The card's name stays a link, not an `<h3>`.** A heading level is knowledge
 * the card cannot have: `<h3>` is right only while the card sits under this
 * section's `<h2>`, which it can no more see than it can see how many siblings
 * it has — the same argument that keeps the `<li>` out here. And nothing is
 * lost by withholding it. The name is a `<Link>`, so it is already in the links
 * rotor, and list-item navigation now supplies the position and count a heading
 * would not have. (Not because `<h3>`s would bury the `<h2>`s — heading
 * navigation is level-aware and jumps between levels independently.)
 */
export function ScopeSection({
  scope,
  rows,
  page,
  onPageChange,
  isPending,
  names,
  shadowersOf,
  onArchive,
  onRestore,
}: {
  scope: TargetScope;
  rows: Target[];
  page: number;
  onPageChange: (page: number) => void;
  isPending: boolean;
  names: ScopeNames;
  shadowersOf: (target: Target) => Target[];
  onArchive: (target: Target) => void;
  onRestore: (target: Target) => void;
}) {
  const { t } = useTranslation("app");
  const slice = slicePage(rows, page);
  const headingId = `targets-${scope}`;

  return (
    // `aria-busy` because `ListSkeleton` is `aria-hidden`: without it the
    // heading, the hint and an em dash are all an AT user gets while the load
    // is in flight, with nothing saying more is coming. All three sections go
    // pending together now, so this is the whole screen, not one third of it.
    <section
      aria-labelledby={headingId}
      aria-busy={isPending}
      className="space-y-3"
    >
      <div className="space-y-1">
        <h2 id={headingId} className="text-sm font-medium">
          {t(`enums.targetScope.${scope}`)}
        </h2>
        <p className="max-w-prose text-xs text-muted-foreground">
          {t(`targets.levelHint.${scope}`)}
        </p>
      </div>

      {isPending ? (
        <ListSkeleton />
      ) : slice.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("targets.sectionEmpty")}
        </p>
      ) : (
        <ul role="list" className="space-y-3">
          {slice.rows.map((target) => (
            <li key={target.id}>
              <TargetCard
                target={target}
                names={names}
                shadowers={shadowersOf(target)}
                onArchive={onArchive}
                onRestore={onRestore}
              />
            </li>
          ))}
        </ul>
      )}

      <ListPagination
        page={slice.page}
        pageCount={slice.pageCount}
        hasPrevious={slice.hasPrevious}
        hasNext={slice.hasNext}
        onPageChange={onPageChange}
      />
    </section>
  );
}
