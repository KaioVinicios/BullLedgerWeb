import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PAGE_SIZE } from "@/schemas/pagination";

/** The shape inside `data` on every list endpoint. */
export interface Page<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface PaginatedQueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<Page<T>>;
  /** The current page, owned by the URL — never by this hook. */
  page: number;
  onPageChange: (page: number) => void;
  enabled?: boolean;
}

/**
 * Wraps a page-numbered list endpoint.
 *
 * `next` and `previous` are absolute server-supplied URLs and are used only
 * for their nullity — is there a neighbouring page. Navigation stays on page
 * numbers, because following a URL the API hands us would let the API drive
 * client routing.
 *
 * URL state is the source of truth: the caller passes `page` in and receives
 * `setPage` to write back, so a filtered page survives a reload, the back
 * button, and being pasted into another browser.
 */
export function usePaginatedQuery<T>(options: PaginatedQueryOptions<T>) {
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    enabled: options.enabled,
    // Keeps a dense table from collapsing into a skeleton on every page step.
    placeholderData: keepPreviousData,
  });

  const count = query.data?.count ?? 0;

  return {
    rows: query.data?.results ?? [],
    count,
    page: options.page,
    pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    hasNext: Boolean(query.data?.next),
    hasPrevious: Boolean(query.data?.previous),
    setPage: options.onPageChange,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
