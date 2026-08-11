import { PAGE_SIZE } from "@/schemas/pagination";

export interface PageSlice<T> {
  rows: T[];
  /** The page actually shown, which may differ from the one asked for. */
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * A page of an array already in hand, cut at the same `PAGE_SIZE` the server
 * pages by — so a bookmarked `?holdingPage=2` lands on the rows it used to.
 *
 * The targets screen loads every target at once, because the shadow note has
 * to compare levels the user is not looking at. Once the whole set is local,
 * asking the server for page 2 of something already downloaded would be a
 * request that buys nothing, and `hasNext` derived from a server URL would be
 * a second opinion about a fact this function already knows exactly.
 *
 * It clamps. A page past the end is a hand-edited URL or a row removed under
 * the reader, and both are better answered with the last real page than with
 * an empty list beside a live "previous" button.
 */
export function slicePage<T>(rows: readonly T[], page: number): PageSlice<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (current - 1) * PAGE_SIZE;

  return {
    rows: rows.slice(start, start + PAGE_SIZE),
    page: current,
    pageCount,
    hasPrevious: current > 1,
    hasNext: current < pageCount,
  };
}
