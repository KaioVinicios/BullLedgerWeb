import { z } from "zod";

import { pageSchema } from "@/schemas/pagination";

/**
 * URL state for the projection screens — the same contract `resourceList.ts`,
 * `ledgerList.ts`, and `pricingList.ts` set.
 *
 * Every field is optional in the *output* as well as the input, so no `<Link>`
 * into these screens has to carry a `search` prop, and every field `.catch`es
 * to its default instead of throwing, because a URL is untrusted input and a
 * stale bookmark should render a screen rather than a route error.
 *
 * None of the three carries `on`. All three endpoints accept a valuation date
 * and default it to today, which is the only date these screens have a reason
 * to ask about — a date picker would be a product decision, not a missing
 * control.
 */

/**
 * Which account groups are *collapsed*, not which are open.
 *
 * Expanded is the resting state — the payload arrives grouped and the figures
 * are the point — so the empty case is the default and there is nothing for
 * `stripSearchParams` to strip. Storing the open set instead would put every
 * account id in the address bar on a screen where nothing had been touched.
 */
export const overviewSearchSchema = z.object({
  closed: z.array(z.uuid()).optional().catch(undefined),
});

export type OverviewSearch = z.infer<typeof overviewSearchSchema>;

export const ALLOCATION_DIMENSIONS = [
  "archetype",
  "currency",
  "country",
] as const;

export type AllocationDimension = (typeof ALLOCATION_DIMENSIONS)[number];

export const allocationDefaults = { dimension: "archetype" } as const;

export const allocationSearchSchema = z.object({
  dimension: z.enum(ALLOCATION_DIMENSIONS).optional().catch(undefined),
});

export type AllocationSearch = z.infer<typeof allocationSearchSchema>;

/**
 * The limits table pages and nothing else: `GET /api/contribution-limits/`
 * declares no `ordering` and no filter, so there is no other state to carry.
 */
export const limitsDefaults = { page: 1 } as const;

export const limitsSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
});

export type LimitsSearch = z.infer<typeof limitsSearchSchema>;
