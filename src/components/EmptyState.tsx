import type { IconComponent } from "@/types/icon";

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  description: string;
  /**
   * The next thing to do. Optional in the type, expected in practice — the
   * whole point of the pattern is to name an action rather than only report an
   * absence. Omit it only where there genuinely is none, which today means the
   * placeholder screens whose area has not been built yet.
   */
  action?: React.ReactNode;
}

/**
 * What a surface says when it has nothing to show. Dashed rather than solid:
 * the border marks a space waiting to be filled, not a card holding content.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold tracking-tight">
          {title}
        </p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
