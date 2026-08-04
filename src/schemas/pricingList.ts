import { z } from "zod";

import { CURRENCIES } from "@/schemas/apiEnums";
import { pageSchema } from "@/schemas/pagination";

/**
 * URL state for the three pricing routes — the same contract the structure and
 * ledger screens set. Param names match the API's (`asset`, `base`, `quote`,
 * `page`) so there is one vocabulary from the address bar to the wire and no
 * mapping layer to drift, and every field `.catch`es to its default rather
 * than throwing, because everything here arrives from a URL and a URL is
 * untrusted input.
 *
 * Neither list carries `ordering`: `GET /api/price-quotes/` and
 * `GET /api/fx-rates/` declare no such parameter, so a sortable header would
 * be a control that cannot work.
 */
export const pricingListDefaults = { page: 1 } as const;

export const pricingListSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
  asset: z.uuid().optional().catch(undefined),
});

export type PricingListSearch = z.infer<typeof pricingListSearchSchema>;

export const fxListDefaults = { page: 1 } as const;

export const fxListSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
  base: z.enum(CURRENCIES).optional().catch(undefined),
  quote: z.enum(CURRENCIES).optional().catch(undefined),
});

export type FxListSearch = z.infer<typeof fxListSearchSchema>;

/**
 * The quote form's only URL state: which asset arrived prefilled, when the
 * coverage block sent the user here. No page and no defaults — a form is not
 * a list, and there is no resting state to strip.
 */
export const newQuoteSearchSchema = z.object({
  asset: z.uuid().optional().catch(undefined),
});

export type NewQuoteSearch = z.infer<typeof newQuoteSearchSchema>;
