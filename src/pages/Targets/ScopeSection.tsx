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
 * **The card's name stays a link, not an `<h3>`.** Heading navigation on this
 * screen is load-bearing for the lesson — the three `<h2>`s *are* the
 * resolution order, which is what the first test in `Targets.test.tsx` pins —
 * and burying them under fifty record names would cost more than it bought.
 * The list already delivers the traversal and the count, and every name is
 * still reachable by the links rotor.
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
    <section aria-labelledby={headingId} className="space-y-3">
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
