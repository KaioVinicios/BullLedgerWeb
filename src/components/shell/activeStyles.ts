/**
 * Active state is TanStack's to decide, not ours: `Link` sets
 * `data-status="active"` and `aria-current="page"` from the real route match,
 * so a reload lands on the right item and nothing has to recompute it.
 *
 * Three signals carry it — a rail marker, a weight change, and a surface tint.
 * The tint alone would not do: the sidebar's resting and active surfaces are
 * 1.05:1 apart in the light theme. And state is never colour alone.
 *
 * Shared by the primary navigation and the footer so that "current" has one
 * vocabulary in the sidebar rather than two that drift.
 */
export const ACTIVE_ITEM =
  "data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground";

/**
 * The rail marker, on the row rather than on the link inside it.
 *
 * `SidebarMenuButton` is `overflow-hidden` with a ~11px corner radius, so a
 * marker drawn at its left edge gets sliced by the curve — it renders about
 * half its height with cut ends. The `<li>` wrapping it is already `relative`
 * and stays `overflow: visible`, which is the one place a flush-left bar can
 * be drawn whole. Keyed off the link's own `data-status` so TanStack remains
 * the single source of truth for what is current.
 */
export const ACTIVE_MARKER =
  "before:pointer-events-none before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary before:opacity-0 before:transition-opacity has-[[data-status=active]]:before:opacity-100";
