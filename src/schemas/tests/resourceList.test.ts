import { describe, expect, it } from "vitest";

import {
  assetListSearchSchema,
  resourceListSearchSchema,
} from "@/schemas/resourceList";

describe("resourceListSearchSchema", () => {
  it("leaves an empty search empty — absence is the default", () => {
    // Outputs stay optional so no <Link> into a list screen is forced to
    // carry a `search` prop; the read site applies `?? 1` / `?? false`.
    expect(resourceListSearchSchema.parse({})).toEqual({
      page: undefined,
      include_archived: undefined,
      ordering: undefined,
    });
  });

  it("keeps valid values", () => {
    expect(
      resourceListSearchSchema.parse({
        page: 3,
        include_archived: true,
        ordering: "-name",
      }),
    ).toEqual({ page: 3, include_archived: true, ordering: "-name" });
  });

  it("falls back per field on hand-edited values instead of throwing", () => {
    expect(
      resourceListSearchSchema.parse({
        page: "not-a-page",
        include_archived: "maybe",
        ordering: "height",
      }),
    ).toEqual({ page: 1, include_archived: undefined, ordering: undefined });
  });
});

describe("assetListSearchSchema", () => {
  it("accepts a real archetype and drops an unknown one", () => {
    expect(assetListSearchSchema.parse({ archetype: "CRYPTO" })).toMatchObject({
      archetype: "CRYPTO",
    });
    expect(
      assetListSearchSchema.parse({ archetype: "BEANIE_BABIES" }).archetype,
    ).toBeUndefined();
  });
});
