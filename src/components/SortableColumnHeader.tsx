import {
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Ordering } from "@/schemas/resourceList";

interface SortableColumnHeaderProps {
  label: string;
  /** The ascending `ordering` value this column sorts by, e.g. `"name"`. */
  field: "name" | "created_at";
  ordering: Ordering | undefined;
  onOrderingChange: (ordering: Ordering | undefined) => void;
  className?: string;
}

/**
 * A column header that owns one `ordering` value in the URL. Clicking cycles
 * ascending → descending → server default, so the default order is always
 * reachable again without editing the address bar. `aria-sort` lives on the
 * `<th>` — the one place assistive tech looks for it — and the icon is the
 * visual echo of the same state, never the only carrier.
 */
export function SortableColumnHeader({
  label,
  field,
  ordering,
  onOrderingChange,
  className,
}: SortableColumnHeaderProps) {
  const direction =
    ordering === field ? "asc" : ordering === `-${field}` ? "desc" : undefined;

  const Icon =
    direction === "asc"
      ? IconSortAscending
      : direction === "desc"
        ? IconSortDescending
        : IconArrowsSort;

  const next: Ordering | undefined =
    direction === undefined
      ? field
      : direction === "asc"
        ? `-${field}`
        : undefined;

  return (
    <TableHead
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : undefined
      }
      className={className}
    >
      <button
        type="button"
        onClick={() => onOrderingChange(next)}
        className={cn(
          "-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
          direction && "text-foreground",
        )}
      >
        {label}
        <Icon
          aria-hidden
          className={cn("size-4", !direction && "text-muted-foreground/70")}
        />
      </button>
    </TableHead>
  );
}
