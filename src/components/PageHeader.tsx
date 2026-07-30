interface PageHeaderProps {
  title: string;
  description?: string;
  /** The screen's primary action, if it has one. */
  action?: React.ReactNode;
}

/**
 * A screen's own title block.
 *
 * It lives in the content region rather than in the app header on purpose: the
 * title belongs beside the action it applies to, and a detail screen can title
 * itself with the record's own name without pushing anything up into the
 * shell.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        {/* Not the base h1 scale: index.css sizes h1 at text-4xl for the
            marketing and auth pages, where the heading is the whole screen.
            In-app the figures are the hero and the title defers to them. */}
        <h1 className="text-2xl">{title}</h1>
        {description && (
          <p className="max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
