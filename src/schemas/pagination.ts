import { z } from "zod";

/** The API's page size. Documented in docs/backend/api-reference.md. */
export const PAGE_SIZE = 50;

/**
 * A page number arriving from the URL, where anything can be typed. `.catch`
 * makes a hand-edited or stale link render page 1 instead of throwing a
 * route-level error at someone who just pasted a URL.
 */
export const pageSchema = z.coerce.number().int().min(1).catch(1);

export const paginationSearchSchema = z.object({ page: pageSchema });

export type PaginationSearch = z.infer<typeof paginationSearchSchema>;
