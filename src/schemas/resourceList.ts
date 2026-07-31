import { z } from "zod";

import { pageSchema } from "@/schemas/pagination";
import { ARCHETYPES } from "@/schemas/apiEnums";
import type { operations } from "@/types/api";

/**
 * URL search state for the structure list screens. The URL is the source of
 * truth — a filtered page must survive a reload, the back button, and being
 * pasted into another browser — and everything arriving from it is untrusted,
 * so every field `.catch`es to its default instead of throwing a route error
 * at whoever edited the address bar.
 *
 * Param names deliberately match the API's query parameters
 * (`include_archived`, `ordering`, `archetype`): one vocabulary end to end,
 * no mapping layer to drift.
 */

export type Ordering = NonNullable<
  NonNullable<
    operations["api_institutions_list"]["parameters"]["query"]
  >["ordering"]
>;

export const ORDERINGS = [
  "name",
  "-name",
  "created_at",
  "-created_at",
] as const satisfies readonly Ordering[];

export const resourceListDefaults = {
  page: 1,
  include_archived: false,
} as const;

/**
 * Every field is optional in the *output* too, deliberately: a required
 * output would make `search` mandatory on every `<Link>` into these screens,
 * including the sidebar's. Absence means the default — the read site says
 * `?? 1` / `?? false` — and `stripSearchParams(resourceListDefaults)` keeps
 * explicitly-written defaults out of the address bar, so the two spellings
 * of "resting state" collapse into one URL.
 */
export const resourceListSearchSchema = z.object({
  page: pageSchema.optional().catch(undefined),
  include_archived: z.boolean().optional().catch(undefined),
  ordering: z.enum(ORDERINGS).optional().catch(undefined),
});

export type ResourceListSearch = z.infer<typeof resourceListSearchSchema>;

/** Assets add the server-side archetype filter to the shared shape. */
export const assetListSearchSchema = resourceListSearchSchema.extend({
  archetype: z.enum(ARCHETYPES).optional().catch(undefined),
});

export type AssetListSearch = z.infer<typeof assetListSearchSchema>;
