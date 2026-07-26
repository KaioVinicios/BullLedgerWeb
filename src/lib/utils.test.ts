import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("resolves conflicting tailwind utilities in favour of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("flex", false, undefined, "gap-2")).toBe("flex gap-2");
  });
});
