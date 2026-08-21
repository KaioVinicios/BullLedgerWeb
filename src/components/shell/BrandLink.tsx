import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { useShellAnchor } from "@/components/shell/useShellAnchor";
import { cn } from "@/lib/utils";
import { PATHS } from "@/routes/path";

/**
 * The brand, in the one place it is defined. The sidebar header carries it on
 * wide viewports; below `md` the sidebar is an off-canvas sheet and takes the
 * mark off screen with it, so the app header carries it there instead. Two
 * call sites, one anchor — including the reason it is an anchor.
 *
 * A plain anchor, not a `Link`, and deliberately so: the brand points at /app,
 * a prefix of every screen, which had it claiming to be the current page
 * alongside the real nav item everywhere, and `exact` only narrows that to
 * /app itself where Overview claims it too. `useShellAnchor` carries that
 * behaviour and the rest of the reasoning; the record shortcut needs it too.
 *
 * `wordmarkClassName` exists for the collapsed rail, the one context that hides
 * the name and keeps the mark.
 */
export function BrandLink({
  className,
  wordmarkClassName,
  ...props
}: React.ComponentProps<"a"> & { wordmarkClassName?: string }) {
  const anchor = useShellAnchor(PATHS.APP);

  return (
    <a
      {...props}
      {...anchor}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      {/* Decorative: the wordmark beside it already says the name. */}
      <BullLedgerLogo aria-hidden className="size-6 shrink-0" />
      <span
        className={cn(
          "font-heading text-base font-semibold tracking-tight",
          wordmarkClassName,
        )}
      >
        BullLedger
      </span>
    </a>
  );
}
