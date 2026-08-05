import { useTranslation } from "react-i18next";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCircleCheck,
  type Icon,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TargetStatus } from "@/schemas/apiEnums";

/**
 * The server's verdict on a holding, as one badge.
 *
 * One file for all four values, for the reason `signedTone.ts` is one file: the
 * vocabulary for a state belongs in one place, or the overview's row and the
 * holding detail grow two versions of it that drift.
 *
 * **Never colour alone.** The label is always rendered, each verdict has its
 * own icon, and colour is the third signal rather than the first — so the badge
 * survives greyscale and a red-green colour deficiency, which is the WCAG 2.1
 * AA bar `PRODUCT.md` sets.
 *
 * **The tone budget is one.** `BELOW_FLOOR` is the only verdict that carries a
 * colour of its own; `BEHIND` deliberately does not. `PRODUCT.md`'s third
 * principle states gains and losses rather than dramatizing them, and a holding
 * running under its target is a fact, not an emergency. And it is a badge and
 * nothing more — no toast, no banner, no animation. Phase 9 ships zero side
 * effects, and what a status is *allowed to do to the page* is part of that.
 *
 * That one tone is `Badge`'s own `destructive` variant rather than a colour
 * pair invented here, which is why **this phase introduces no new colour
 * decision to measure**: the pair ships with the component and is already
 * rendered by `DesignSystem/sections/FeedbackSection.tsx` and `DataSection.tsx`.
 * Overriding `outline` with a hand-picked `border-destructive/50` would have
 * been a second opinion about a decision already made — and a new pair someone
 * would then have to measure.
 *
 * Whether that incumbent pair clears 4.5:1 in both themes is not recorded
 * anywhere in this project. It is a design-system question rather than this
 * component's, and it is on the Phase 9 live-walk list.
 */
const ICONS: Record<TargetStatus, Icon> = {
  AHEAD: IconArrowUpRight,
  ON_TRACK: IconCircleCheck,
  BEHIND: IconArrowDownRight,
  BELOW_FLOOR: IconAlertTriangle,
};

const VARIANTS = {
  AHEAD: "outline",
  ON_TRACK: "outline",
  BEHIND: "outline",
  BELOW_FLOOR: "destructive",
} as const satisfies Record<TargetStatus, "outline" | "destructive">;

export function TargetStatusBadge({
  status,
  className,
}: {
  status: TargetStatus;
  className?: string;
}) {
  const { t } = useTranslation("app");
  const StatusIcon = ICONS[status];

  return (
    <Badge
      variant={VARIANTS[status]}
      className={cn("gap-1 font-normal", className)}
    >
      <StatusIcon aria-hidden className="size-3.5" />
      {t(`enums.targetStatus.${status}`)}
    </Badge>
  );
}
