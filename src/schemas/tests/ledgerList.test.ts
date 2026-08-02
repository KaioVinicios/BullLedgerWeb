import { describe, expect, it } from "vitest";

import { ledgerListSearchSchema, lotsSearchSchema } from "@/schemas/ledgerList";

describe("ledgerListSearchSchema", () => {
  it("leaves an empty search empty — absence is the default", () => {
    expect(ledgerListSearchSchema.parse({})).toEqual({
      page: undefined,
      include_voided: undefined,
      account: undefined,
      asset: undefined,
      type: undefined,
      occurred_after: undefined,
      occurred_before: undefined,
    });
  });

  it("keeps a fully specified filter", () => {
    const search = {
      page: 2,
      include_voided: true,
      account: "11111111-1111-4111-8111-111111111111",
      asset: "22222222-2222-4222-8222-222222222222",
      type: "BUY" as const,
      occurred_after: "2026-01-01",
      occurred_before: "2026-12-31",
    };

    expect(ledgerListSearchSchema.parse(search)).toEqual(search);
  });

  it("falls back per field rather than throwing at whoever edited the URL", () => {
    expect(
      ledgerListSearchSchema.parse({
        type: "NOT_A_TYPE",
        account: "not-a-uuid",
        occurred_after: "31/12/2026",
        include_voided: "yes",
      }),
    ).toEqual({
      page: undefined,
      include_voided: undefined,
      account: undefined,
      asset: undefined,
      type: undefined,
      occurred_after: undefined,
      occurred_before: undefined,
    });
  });

  it("rejects a date that looks right and cannot exist", () => {
    // `new Date("2026-02-30")` rolls forward to March 2nd rather than failing,
    // which is exactly the kind of silent wrong the calendar-date check exists
    // to catch.
    expect(
      ledgerListSearchSchema.parse({ occurred_after: "2026-02-30" })
        .occurred_after,
    ).toBeUndefined();
  });
});

describe("lotsSearchSchema", () => {
  it("carries the two filters the lots endpoint accepts, and nothing else", () => {
    expect(
      lotsSearchSchema.parse({
        account: "11111111-1111-4111-8111-111111111111",
        asset: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({
      account: "11111111-1111-4111-8111-111111111111",
      asset: "22222222-2222-4222-8222-222222222222",
    });
  });
});
