import { describe, expect, it } from "vitest";

import { weightToWidth } from "@/utils/allocation";

describe("weightToWidth", () => {
  it("turns a decimal-string fraction into a CSS percentage", () => {
    expect(weightToWidth("0.1375")).toBe("13.7500%");
  });

  it("spans the full bar at one", () => {
    expect(weightToWidth("1")).toBe("100.0000%");
  });

  it("gives an unknown weight no width, because it has no basis to claim one", () => {
    expect(weightToWidth(null)).toBe("0%");
  });

  it("survives a weight carried past what a float holds", () => {
    // Rounded to the bar's sub-pixel budget, not truncated — and rounded by
    // Big rather than by a float that would already have lost the tail.
    expect(weightToWidth("0.123456789012")).toBe("12.3457%");
  });

  it("clamps outside the bar rather than overflowing it", () => {
    expect(weightToWidth("1.5")).toBe("100.0000%");
    expect(weightToWidth("-0.2")).toBe("0.0000%");
  });
});
