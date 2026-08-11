import { describe, expect, it } from "vitest";

import { PAGE_SIZE } from "@/schemas/pagination";
import { slicePage } from "@/utils/slicePage";

const rows = Array.from({ length: 60 }, (_, index) => index);

describe("slicePage", () => {
  it("returns the first page and reports a second", () => {
    const slice = slicePage(rows, 1);

    expect(slice.rows).toHaveLength(PAGE_SIZE);
    expect(slice.rows[0]).toBe(0);
    expect(slice.page).toBe(1);
    expect(slice.pageCount).toBe(2);
    expect(slice.hasPrevious).toBe(false);
    expect(slice.hasNext).toBe(true);
  });

  it("returns the remainder on the last page", () => {
    const slice = slicePage(rows, 2);

    expect(slice.rows).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
    expect(slice.hasPrevious).toBe(true);
    expect(slice.hasNext).toBe(false);
  });

  // A hand-edited `?holdingPage=99` must land on real rows rather than on an
  // empty screen with a working "previous" button. `usePaginatedQuery` could
  // not clamp — it never knew the total until the server answered — and this
  // does, so the improvement is taken rather than reproduced.
  it("clamps a page past the end onto the last page", () => {
    expect(slicePage(rows, 99).page).toBe(2);
    expect(slicePage(rows, 99).rows[0]).toBe(50);
  });

  it("clamps a page below one onto the first", () => {
    expect(slicePage(rows, 0).page).toBe(1);
    expect(slicePage(rows, -3).page).toBe(1);
  });

  it("reports one page for an empty list rather than zero", () => {
    const slice = slicePage([], 1);

    expect(slice.rows).toEqual([]);
    expect(slice.pageCount).toBe(1);
    expect(slice.hasNext).toBe(false);
  });
});
