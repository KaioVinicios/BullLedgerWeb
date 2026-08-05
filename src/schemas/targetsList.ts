import { z } from "zod";

import {
  ARCHETYPES,
  TARGET_SCOPES,
  type TargetScope,
} from "@/schemas/apiEnums";
import { pageSchema } from "@/schemas/pagination";

/**
 * URL search state for the targets screens. Same contract as `resourceList.ts`:
 * the URL is the source of truth, everything arriving from it is untrusted, and
 * every field `.catch`es to its default rather than throwing a route error at
 * whoever edited the address bar.
 *
 * **Three page parameters rather than one.** The list renders one section per
 * level and each is its own query, so a shared `page` would step all three
 * together — which is not a thing anyone means. The cost is three parameters in
 * a URL that, in the common case, carries none of them: each section holds
 * fewer rows than a page, and `ListPagination` renders nothing on a single
 * page.
 *
 * `include_archived` is deliberately **not** per section. Archival is a
 * property of a target, not of a level, and three toggles for one idea would be
 * three ways to ask the same question.
 */
export const targetsListDefaults = {
  holdingPage: 1,
  accountPage: 1,
  portfolioPage: 1,
  include_archived: false,
} as const;

export const targetsListSearchSchema = z.object({
  holdingPage: pageSchema.optional().catch(undefined),
  accountPage: pageSchema.optional().catch(undefined),
  portfolioPage: pageSchema.optional().catch(undefined),
  include_archived: z.boolean().optional().catch(undefined),
});

export type TargetsListSearch = z.infer<typeof targetsListSearchSchema>;

/**
 * Which URL parameter each section owns. A map rather than a string built from
 * the scope, so a renamed parameter is a compile error in one place and the
 * list of parameters stays greppable.
 */
export const PAGE_PARAM = {
  HOLDING: "holdingPage",
  ACCOUNT_ARCHETYPE: "accountPage",
  PORTFOLIO_ARCHETYPE: "portfolioPage",
} as const satisfies Record<TargetScope, keyof TargetsListSearch>;

/**
 * The create screen's prefill — what the holding detail's "set one" link
 * writes, carrying the scope and the two ids that screen already holds.
 *
 * Every field optional and every field `.catch`ing, so a hand-edited link opens
 * a blank form rather than an error. Ids are validated as UUIDs because the
 * form feeds them to a select whose options are real ids: a malformed one would
 * silently select nothing, and dropping it makes that explicit.
 */
export const newTargetSearchSchema = z.object({
  scope: z.enum(TARGET_SCOPES).optional().catch(undefined),
  account: z.string().uuid().optional().catch(undefined),
  asset: z.string().uuid().optional().catch(undefined),
  archetype: z.enum(ARCHETYPES).optional().catch(undefined),
});

export type NewTargetSearch = z.infer<typeof newTargetSearchSchema>;
