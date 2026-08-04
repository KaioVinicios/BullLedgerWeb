import { describe, expect, it } from "vitest";

import { COST_BASIS_METHOD_BY_COUNTRY, COUNTRIES } from "@/schemas/apiEnums";

describe("COST_BASIS_METHOD_BY_COUNTRY", () => {
  it("gives every country a method", () => {
    for (const country of COUNTRIES) {
      expect(COST_BASIS_METHOD_BY_COUNTRY[country]).toBeDefined();
    }
  });

  it("uses weighted average where the tax code averages, FIFO where it queues", () => {
    // business-rules.md §Cost basis by country: BR preço médio, CA adjusted
    // cost base, US FIFO / specific-lot.
    expect(COST_BASIS_METHOD_BY_COUNTRY.BR).toBe("WEIGHTED_AVERAGE");
    expect(COST_BASIS_METHOD_BY_COUNTRY.CA).toBe("WEIGHTED_AVERAGE");
    expect(COST_BASIS_METHOD_BY_COUNTRY.US).toBe("FIFO");
  });
});
