import { describe, expect, it } from "vitest";

import { createResourceKeys, PORTFOLIO_KEY } from "@/services/queryKeys";

interface Filters {
  page?: number;
}

describe("createResourceKeys", () => {
  const keys = createResourceKeys<Filters>("accounts");

  it("roots every key at the resource name", () => {
    expect(keys.all).toEqual(["accounts"]);
    expect(keys.list({ page: 1 })[0]).toBe("accounts");
    expect(keys.detail("abc")[0]).toBe("accounts");
  });

  it("separates lists from details", () => {
    expect(keys.list({ page: 1 })).toEqual(["accounts", "list", { page: 1 }]);
    expect(keys.detail("abc")).toEqual(["accounts", "detail", "abc"]);
  });

  it("varies the list key with its filters", () => {
    expect(keys.list({ page: 1 })).not.toEqual(keys.list({ page: 2 }));
  });
});

describe("PORTFOLIO_KEY", () => {
  it("is the single root every projection hangs off", () => {
    expect(PORTFOLIO_KEY).toEqual(["portfolio"]);
  });
});
