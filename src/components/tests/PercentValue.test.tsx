import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PercentValue } from "@/components/PercentValue";

describe("PercentValue", () => {
  it("renders a decimal fraction as a percentage", () => {
    render(<PercentValue value="0.1375" locale="en-US" />);

    expect(screen.getByText(/13\.75%/)).toBeInTheDocument();
  });

  it("renders on tabular numerals", () => {
    render(<PercentValue value="0.1375" locale="en-US" />);

    expect(screen.getByText(/13\.75%/)).toHaveClass("tabular-nums");
  });
});
