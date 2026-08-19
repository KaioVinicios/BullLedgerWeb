import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long the button stays in its confirmed state before returning. */
const CONFIRM_MS = 2000;

interface CopyFieldProps {
  /**
   * What the value is, in the reader's words. It names the field *and* the
   * copy button — "Copy Bitcoin address" rather than "Copy" repeated five
   * times down a screen, which is what a screen-reader user would otherwise
   * hear (WCAG 2.4.6).
   */
  label: string;
  /** A qualifier the reader must not miss: a network, a key type, a scope. */
  hint?: string;
  /** The exact string to copy, shown verbatim. */
  value: string;
  className?: string;
}

/**
 * A value the reader's job is to take somewhere else: an address, a key, a
 * token.
 *
 * Three things this owes that a styled `<input readonly>` does not give for
 * free, and the reason this is markup rather than a form control. The value
 * is not editable and never was, so it is text; it must wrap rather than
 * scroll, because a 42-character address hidden past the right edge of a box
 * is a transcription error waiting to happen; and it is monospaced with
 * `break-all` so the reader can verify it character by character against
 * whatever they pasted it into. That last one is the only kind of monospace
 * this project spends — measurement, not costume.
 *
 * Confirmation is inline rather than a toast. The reader's eye is on the
 * button they just pressed, and a notification in the far corner asks them to
 * look somewhere else to learn that the thing under their cursor worked. The
 * failure path *is* a toast, because it carries an instruction ("copy it by
 * hand") that must outlive the two seconds this button spends confirming.
 */
export function CopyField({ label, hint, value, className }: CopyFieldProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Unmounting mid-confirmation must not leave a setState pointed at a dead
  // component — the reader can navigate away inside the two seconds.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      // Absent on `http://` origins and in older browsers. Reading it through
      // an optional call rather than assuming it means the failure lands in
      // the same branch as a rejected write, with the same instruction.
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
    } catch {
      toast.error(t("copy.failed"));
    }
  }

  const action = copied ? t("copy.done") : t("copy.action");

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>

      {/*
        The value and its button share one bordered field so they read as one
        object. `items-start` rather than `items-center`: a long address wraps
        to three lines on a narrow viewport, and a vertically centred button
        would drift away from the label it belongs to.
      */}
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 py-2 pr-2 pl-3">
        <span className="min-w-0 flex-1 py-1 font-mono text-sm break-all selection:bg-primary/30">
          {value}
        </span>
        <Button
          type="button"
          // Outline rather than ghost: on a screen whose entire purpose is
          // taking a value somewhere else, the control that does it has to
          // look like a control. Outline rather than the gold default for the
          // other half of the reason — five primary buttons down one column
          // would spend the accent five times and mark nothing.
          variant="outline"
          size="sm"
          onClick={copy}
          // Built from the word the button is currently showing, not from a
          // fixed one. Five buttons all reading "Copy" need distinct names to
          // be told apart (WCAG 2.4.6), and the visible label has to stay
          // inside that name in *both* states or voice control loses the
          // button the moment it says "Copied" (WCAG 2.5.3).
          aria-label={t("copy.label", { action, label })}
          className="shrink-0"
        >
          {copied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
          {action}
        </Button>
      </div>

      {/*
        The button's own label changes, but a screen reader announces a
        changed label only if focus happens to be there when it changes.
        This says it once, politely, either way.
      */}
      <span role="status" className="sr-only">
        {copied ? t("copy.done") : ""}
      </span>
    </div>
  );
}
