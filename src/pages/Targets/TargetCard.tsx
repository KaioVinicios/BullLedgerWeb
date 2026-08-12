import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconArchive,
  IconDots,
  IconInfoCircle,
  IconPencil,
  IconRestore,
} from "@tabler/icons-react";

import { TargetSentence } from "@/components/TargetSentence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { Target } from "@/services/targets";
import { describeTarget } from "@/utils/targetSentence";
import { targetScopeName, type ScopeNames } from "@/utils/targetScope";

/** Past this, the list of names is noise and the count is the fact. */
const NAMES_SHOWN = 3;

/**
 * A plain comma, and deliberately not `Intl.ListFormat`.
 *
 * List-format supplies its own conjunction, which would collide with the one
 * `shadowedMore` already carries: `"A, B, and C, and 2 more"`. The remainder
 * clause is the last item in this list rather than a suffix appended after it,
 * so the join has to stay dumb.
 */
const NAME_SEPARATOR = ", ";

/**
 * One target, as a card rather than a table row.
 *
 * A row was the right shape while the cell held `3% monthly from month 0 ·
 * +2 more`; it is the wrong one now that the cell holds the whole ladder in a
 * sentence. Columns buy alignment between rows, and there is nothing left to
 * align — the figures sit inside prose whose length varies by ladder.
 *
 * **The shadow note is neutral, and says "part".** A more specific target
 * covering some of this one's reach is the hierarchy working exactly as
 * `business-rules.md` describes, not a conflict: a portfolio Crypto default
 * still governs every crypto holding the narrower targets do not name. So the
 * icon is informational, the colour is the muted ramp, and it is ordinary text
 * rather than `role="alert"` — a state, not an event. `PRODUCT.md`'s third
 * principle is the rule being followed: state it, do not dramatize it.
 *
 * **A `<div>`, not an `<li>` or an `<article>`.** The card does not know how
 * many of it there are; the section that lists them does, and it owns the
 * wrapper. Declaring `<li>` here would break the moment one of these were
 * rendered on its own, and an `<article>` inside a future `<ul>` would be
 * invalid markup this file could not see.
 */
export function TargetCard({
  target,
  names,
  shadowers,
  onArchive,
  onRestore,
}: {
  target: Target;
  names: ScopeNames;
  shadowers: Target[];
  onArchive: (target: Target) => void;
  onRestore: (target: Target) => void;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  const name = targetScopeName(target, names, t);
  const clauses = describeTarget(target, { names, t, locale });

  const shown = shadowers
    .slice(0, NAMES_SHOWN)
    .map((row) => targetScopeName(row, names, t));
  const hidden = shadowers.length - shown.length;
  const listed = (
    hidden > 0
      ? [...shown, t("targets.shadowedMore", { count: hidden })]
      : shown
  ).join(NAME_SEPARATOR);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={PATHS.TARGETS_EDIT}
            params={{ id: target.id }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {name}
          </Link>
          {target.archived_at !== null && (
            <Badge variant="outline">{t("structure.archivedBadge")}</Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Pulled back out to the card's optical edge: the ghost button's
                own padding would otherwise read as a second, wider margin on
                the one corner that has no content to justify it. */}
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-2 shrink-0"
              aria-label={t("structure.openMenu", { name })}
            >
              <IconDots aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={PATHS.TARGETS_EDIT} params={{ id: target.id }}>
                <IconPencil aria-hidden />
                {t("structure.edit")}
              </Link>
            </DropdownMenuItem>
            {target.archived_at === null ? (
              <DropdownMenuItem onSelect={() => onArchive(target)}>
                <IconArchive aria-hidden />
                {t("structure.archive")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onRestore(target)}>
                <IconRestore aria-hidden />
                {t("structure.restore")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tight to the name, which is its subject; the note below is a separate
          register and gets the wider gap. */}
      <TargetSentence clauses={clauses} layout="line" className="mt-1.5" />

      {shadowers.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <IconInfoCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {t("targets.shadowed", {
              count: shadowers.length,
              names: listed,
            })}
          </span>
        </p>
      )}
    </div>
  );
}
