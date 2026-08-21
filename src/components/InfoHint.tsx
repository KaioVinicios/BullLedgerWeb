import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ExplainMetric } from "@/i18n/explain";
import { cn } from "@/lib/utils";

/**
 * The explanation for one figure, beside the figure.
 *
 * Takes a metric key and nothing else. The copy lives in the `explain`
 * namespace, lifted from the API's own glossary (`docs/backend/metrics.md`) —
 * a call site that *could* pass its own text is a call site where the wording
 * drifts away from the document that defines the number.
 *
 * A popover, not a tooltip. Hover has no touch equivalent short of a
 * long-press, and this carries two sentences rather than a word: it opens on
 * click, tap, Enter and Space, takes focus, closes on Escape, and hands focus
 * back. `PRODUCT.md`'s first principle survives either way — the trigger sits
 * with the *label*, never with the figure, so the number stays the largest
 * unannotated thing on the screen.
 *
 * An absent key renders nothing at all: no trigger, no empty bubble. A button
 * that opens onto blankness promises an explanation the product does not have,
 * which is worse than staying quiet.
 */
export function InfoHint({
  metric,
  className,
}: {
  metric: ExplainMetric;
  className?: string;
}) {
  const { t, i18n } = useTranslation("explain");

  if (!i18n.exists(`explain:${metric}.body`)) return null;

  const label = t(`${metric}.label`);

  return (
    <Popover>
      <PopoverTrigger
        // The label is a heading inside the popover and a noun phrase in the
        // question that opens it, so it is lowercased here and only here.
        aria-label={t("trigger", { label: label.toLocaleLowerCase() })}
        className={cn(
          // A 14px glyph in a 24px target: the mark defers to the figure it
          // annotates, the hit area defers to nothing.
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle",
          "text-muted-foreground transition-colors hover:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
      >
        <IconInfoCircle aria-hidden className="size-3.5" />
      </PopoverTrigger>

      <PopoverContent align="start" className="text-xs">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription className="leading-relaxed">
            {t(`${metric}.body`)}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
