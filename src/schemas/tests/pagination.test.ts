import { describe, expect, it } from "vitest";

import { paginationSearchSchema } from "@/schemas/pagination";

describe("paginationSearchSchema", () => {
  it("coerces a string page from the URL into a number", () => {
    expect(paginationSearchSchema.parse({ page: "3" })).toEqual({ page: 3 });
  });

  it("defaults to page 1 when absent", () => {
    expect(paginationSearchSchema.parse({})).toEqual({ page: 1 });
  });

  it("falls back to page 1 rather than throwing on junk", () => {
    expect(paginationSearchSchema.parse({ page: "banana" })).toEqual({
      page: 1,
    });
    expect(paginationSearchSchema.parse({ page: "0" })).toEqual({ page: 1 });
    expect(paginationSearchSchema.parse({ page: "-4" })).toEqual({ page: 1 });
    expect(paginationSearchSchema.parse({ page: "1.5" })).toEqual({ page: 1 });
  });
});
