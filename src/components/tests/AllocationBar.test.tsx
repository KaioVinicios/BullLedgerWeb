import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import {
  AllocationBar,
  type AllocationSegment,
} from "@/components/AllocationBar";

const segments: AllocationSegment[] = [
  {
    id: "EXCHANGE_SECURITY",
    label: "Exchange security",
    value: { amount: 44_400, currency: "BRL" },
    weight: "0.444",
    complete: true,
  },
  {
    id: "CRYPTO",
    label: "Crypto",
    value: { amount: 55_600, currency: "BRL" },
    weight: "0.556",
    complete: true,
  },
];

describe("AllocationBar", () => {
  it("sizes each segment from its weight", () => {
    const { container } = render(<AllocationBar segments={segments} />);
    const fills = container.querySelectorAll("[data-segment]");

    // Normalized by the CSSOM, which drops the trailing zeros `weightToWidth`
    // emits; its own unit test pins the exact string it produces.
    expect(fills).toHaveLength(2);
    expect((fills[0] as HTMLElement).style.width).toBe("44.4%");
    expect((fills[1] as HTMLElement).style.width).toBe("55.6%");
  });

  it("is hidden from assistive technology, because the table carries the data", () => {
    const { container } = render(<AllocationBar segments={segments} />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("carries no text of its own, so nothing is readable only as colour", () => {
    const { container } = render(<AllocationBar segments={segments} />);

    expect(container.textContent).toBe("");
  });

  it("renders nothing at all when no segment has a weight", () => {
    const { container } = render(
      <AllocationBar
        segments={[{ ...segments[0], weight: null, complete: false }]}
      />,
    );

    // An empty trough would read as a real zero; absence is the honest render.
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an empty dimension", () => {
    const { container } = render(<AllocationBar segments={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("drops an unweighable slice rather than giving it a zero-width sliver", () => {
    const { container } = render(
      <AllocationBar
        segments={[segments[0], { ...segments[1], weight: null }]}
      />,
    );

    expect(container.querySelectorAll("[data-segment]")).toHaveLength(1);
  });
});
