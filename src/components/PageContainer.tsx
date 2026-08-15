import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * How a screen decides its width.
 *
 * - `full` — the content region *is* the measure. Tables, projections, and
 *   dashboards earn every pixel the viewport gives them, and a cap on those
 *   would throw away columns the user came to compare.
 * - `form` — the content has an optimal measure of its own, narrower than the
 *   region. Forms, settings, and prose read worse wide, not better: a 1000px
 *   text input weakens the tie between a label and its field, and a line of
 *   prose past ~75 characters loses the reader on the carriage return.
 * - `form-wide` — a form that reads beside something. The target form puts a
 *   live summary panel next to its fields, and the pair needs more than the
 *   form measure without becoming a full-width table screen.
 */
export type PageWidth = "full" | "form" | "form-wide";

const WIDTH: Record<PageWidth, string> = {
  full: "",
  form: "max-w-3xl",
  "form-wide": "max-w-5xl",
};

interface PageContainerProps {
  children: ReactNode;
  /**
   * Defaults to `full`, because most of this product is figures in tables and
   * a screen should have to *ask* to be narrow.
   */
  width?: PageWidth;
  className?: string;
}

/**
 * The one place a screen's width is decided.
 *
 * It exists so the decision is named rather than typed: before this, the only
 * screen with real content carried a bare `max-w-3xl`, and every screen after
 * it would have invented its own number. That is the same drift `PATHS` and
 * `ENDPOINTS` already prevent for routes and endpoints — a value that must
 * agree across the app belongs in one module, not in ten JSX attributes.
 *
 * A capped column is centred. The screen is one block — heading, description,
 * and fields share a left edge, so the title always sits over the input it
 * introduces rather than adrift from it — and the room left over reads as
 * framing on both sides instead of a long void down the right.
 *
 * `full` has nothing to centre: its content already is the region, so it gets
 * no centring class that would only be a no-op.
 *
 * The page heading belongs *inside* this, not above it: a screen has one
 * measure, and an action in `PageHeader` should sit over the content it acts
 * on rather than at the far edge of an empty region.
 */
export function PageContainer({
  children,
  width = "full",
  className,
}: PageContainerProps) {
  return (
    <div className={cn(WIDTH[width], width !== "full" && "mx-auto", className)}>
      {children}
    </div>
  );
}
