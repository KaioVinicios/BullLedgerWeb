import { z } from "zod";

import { MOVEMENT_TYPES } from "@/schemas/apiEnums";
import { pageSchema } from "@/schemas/pagination";
import { isCalendarDate } from "@/utils/date";

/**
 * The ledger's URL state — the same contract `resourceList.ts` sets for the
 * structure screens, with the ledger's own filters.
 *
 * Param names match the API's (`include_voided`, `occurred_after`,
 * `occurred_before`) so there is one vocabulary from the address bar to the
 * wire and no mapping layer to drift. Every field `.catch`es to its default
 * instead of throwing, because everything here arrives from a URL and a URL is
 * untrusted input — a stale bookmark should render the ledger, not an error.
 *
 * There is no `ordering`: the server orders by `occurred_on` then entry time,
 * which is the order the domain means, and no parameter exists to change it.
 */
const calendarDate = z.string().refine(isCalendarDate);

export const ledgerListDefaults = {
  page: 1,
  include_voided: false,
} as const;

export const ledgerListSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
  include_voided: z.boolean().optional().catch(undefined),
  account: z.uuid().optional().catch(undefined),
  asset: z.uuid().optional().catch(undefined),
  type: z.enum(MOVEMENT_TYPES).optional().catch(undefined),
  occurred_after: calendarDate.optional().catch(undefined),
  occurred_before: calendarDate.optional().catch(undefined),
});

export type LedgerListSearch = z.infer<typeof ledgerListSearchSchema>;

/**
 * The lots screen's URL state. Narrower than the ledger's on purpose:
 * `GET /api/lots/` filters by account and asset only, and a lot means nothing
 * outside one holding, so there is no page, type, or date to carry.
 */
export const lotsSearchSchema = z.object({
  account: z.uuid().optional().catch(undefined),
  asset: z.uuid().optional().catch(undefined),
});

export type LotsSearch = z.infer<typeof lotsSearchSchema>;
