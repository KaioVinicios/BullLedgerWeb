import { z } from "zod";

import { ARCHETYPES, type AllOf } from "@/schemas/apiEnums";
import { pageSchema } from "@/schemas/pagination";
import type { operations } from "@/types/api";

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
 * Which account's tab is open — and absence is General.
 *
 * The same idiom the screen's previous `closed` field used: the resting state
 * writes nothing to the address bar, so `<Link to="/app">` needs no `search`
 * prop and there is nothing for `stripSearchParams` to strip. `.catch`
 * degrades a stale bookmark — an account since archived, or a malformed id —
 * to General rather than throwing a route error.
 *
 * `closed` is gone with the collapsible account list it controlled: the groups
 * now live one per tab, where there is only ever one and nothing to collapse.
 */
export const overviewSearchSchema = z.object({
  account: z.uuid().optional().catch(undefined),
});

export type OverviewSearch = z.infer<typeof overviewSearchSchema>;

export const HOLDINGS_PIVOTS = ["account", "asset"] as const;
export type HoldingsPivot = (typeof HOLDINGS_PIVOTS)[number];

export const HOLDINGS_GRAINS = ["set", "instance"] as const;
export type HoldingsGrain = (typeof HOLDINGS_GRAINS)[number];

/**
 * URL state for the holdings screen: which way it is grouped, how finely, and
 * which groups are collapsed.
 *
 * `grain` is not a second pivot. It changes what a row *is* — a position, or
 * one of the purchases that built it — and the unit columns follow from that
 * rather than from a control of their own: a set shows what it cost on average,
 * an instance shows what that purchase paid.
 *
 * `z.array(z.string())` rather than the overview's `z.array(z.uuid())`, because
 * the group gathering unaffiliated accounts is keyed by the `NO_INSTITUTION`
 * sentinel and not by an id.
 */
export const holdingsDefaults = { by: "account", grain: "set" } as const;

export const holdingsSearchSchema = z.object({
  by: z.enum(HOLDINGS_PIVOTS).optional().catch(undefined),
  grain: z.enum(HOLDINGS_GRAINS).optional().catch(undefined),
  closed: z.array(z.string()).optional().catch(undefined),
});

export type HoldingsSearch = z.infer<typeof holdingsSearchSchema>;

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
 * From the operation, never hand-written: the same derivation
 * `resourceList.ts`'s `Ordering` uses.
 */
export type SalesOrdering = NonNullable<
  NonNullable<
    operations["api_portfolio_sales_retrieve"]["parameters"]["query"]
  >["ordering"]
>;

/**
 * The `satisfies` catches a value here that the API no longer accepts; on
 * its own it says nothing about a value the API gained. `AllOf` (from
 * `apiEnums.ts`) closes that second direction — a seventh ordering the
 * server starts accepting fails this line to compile instead of shipping
 * silently with no UI option.
 */
export const SALES_ORDERINGS = [
  "-sold_on",
  "sold_on",
  "-profit_rate",
  "profit_rate",
  "-purchased_on",
  "purchased_on",
] as const satisfies readonly SalesOrdering[];

const _salesOrderingsExhaustive: AllOf<SalesOrdering, typeof SALES_ORDERINGS> =
  SALES_ORDERINGS;
void _salesOrderingsExhaustive;

export const SALES_RESULTS = ["PROFIT", "LOSS"] as const;

/**
 * URL state for the sales history screen.
 *
 * `ordering` is the only field with a default worth naming — `-sold_on`, most
 * recent disposal first, the same resting order Task 5 verified live. Every
 * other field is a filter with no default of its own: absent means
 * unfiltered, not "today's account" or "every archetype", so there is nothing
 * for `salesDefaults` to say about them.
 *
 * `account` and `asset` are `z.uuid()` because the API rejects anything else
 * with 400 (`SaleRow.account.id`/`.asset.id`). `archetype` reuses the shared
 * `ARCHETYPES` list from `apiEnums.ts` — the same enum `assetListSearchSchema`
 * validates against — rather than restating it, so a fifth archetype is one
 * file's problem, not two. `result` and `ordering` have no list of their own
 * to share and are declared inline. Every enum field degrades an unknown
 * value through `.catch` rather than rejecting it. `sold_from` and `sold_to`
 * filter exits, not lots — see the operation's own parameter descriptions —
 * but the URL state does not need to know that distinction to carry two
 * dates.
 *
 * Only the non-default values reach the URL; `stripSearchParams` drops the
 * rest.
 *
 * `page` follows the same shape every other paginated list screen declares
 * it with (`resourceListDefaults`, `ledgerListDefaults`, `limitsDefaults`):
 * `pageSchema.optional().catch(undefined)` on the schema, `1` as the default.
 * `GET /api/portfolio/sales/` paginates at `PAGE_SIZE` like every other list
 * endpoint; without this field the 51st sold-from lot would be unreachable.
 */
export const salesDefaults = { ordering: "-sold_on", page: 1 } as const;

export const salesSearchSchema = z.object({
  account: z.uuid().optional().catch(undefined),
  asset: z.uuid().optional().catch(undefined),
  archetype: z.enum(ARCHETYPES).optional().catch(undefined),
  sold_from: z.iso.date().optional().catch(undefined),
  sold_to: z.iso.date().optional().catch(undefined),
  result: z.enum(SALES_RESULTS).optional().catch(undefined),
  ordering: z.enum(SALES_ORDERINGS).optional().catch(undefined),
  // Hidden by default the same way the endpoint hides it; not `on`, which
  // stays out entirely — no v1 screen asks for a historical valuation date,
  // the same reason `overviewSearchSchema` omits its own.
  include_archived: z.boolean().optional().catch(undefined),
  page: pageSchema.optional().catch(undefined),
});

export type SalesSearch = z.infer<typeof salesSearchSchema>;

/**
 * The limits table pages and nothing else: `GET /api/contribution-limits/`
 * declares no `ordering` and no filter, so there is no other state to carry.
 */
export const limitsDefaults = { page: 1 } as const;

export const limitsSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
});

export type LimitsSearch = z.infer<typeof limitsSearchSchema>;
