export interface ResourceKeys<TFilters> {
  /** Invalidate this to drop every cached query for the resource. */
  all: readonly [string];
  list: (filters: TFilters) => readonly [string, "list", TFilters];
  detail: (id: string) => readonly [string, "detail", string];
}

/**
 * Builds the hierarchical key factory every resource uses. Hierarchy is what
 * makes invalidation cheap: invalidating `all` drops lists and details alike.
 */
export function createResourceKeys<TFilters>(
  resource: string,
): ResourceKeys<TFilters> {
  return {
    all: [resource] as const,
    list: (filters: TFilters) => [resource, "list", filters] as const,
    detail: (id: string) => [resource, "detail", id] as const,
  };
}

/**
 * Every read-only projection — overview, allocation, holding detail — lives
 * under this root.
 *
 * The invalidation rule for the whole app is one line: **any mutation to
 * movements, price quotes, FX rates, the profile, or targets invalidates
 * `PORTFOLIO_KEY` wholesale.** Coarse on purpose. A stale total is a
 * correctness bug; an extra refetch is not. This is the client-side
 * expression of "the client records, it never derives".
 *
 * Targets are the odd one on that list and worth the extra sentence: a target
 * changes no *figure* the projections carry. It changes the derived target
 * status they carry beside the figures, which is enough — a screen showing a
 * holding with no status right after its target was created is wrong.
 */
export const PORTFOLIO_KEY = ["portfolio"] as const;
