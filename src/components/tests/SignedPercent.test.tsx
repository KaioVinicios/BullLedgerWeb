import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SignedPercent } from "@/components/SignedPercent";

describe("SignedPercent", () => {
  it("signs a gain and names the direction for assistive technology", () => {
    const { container } = render(
      <SignedPercent value="0.1375" locale="en-US" />,
    );

    expect(container.textContent).toMatch(/\+13\.75%/);
    expect(container.textContent).toMatch(/gain/i);
  });

  it("owns the sign on a loss rather than letting the formatter emit it", () => {
    const { container } = render(
      <SignedPercent value="-0.0825" locale="en-US" />,
    );

    // One minus, in front, symmetrical with the plus above — never the
    // formatter's own, which a locale is free to place differently.
    expect(container.textContent).toMatch(/^-8\.25%/);
    expect(container.textContent).not.toMatch(/--/);
    expect(container.textContent).toMatch(/loss/i);
  });

  it("gives zero no sign, no tone, and no word", () => {
    const { container } = render(<SignedPercent value="0" locale="en-US" />);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/gain|loss/i);
    expect(container.querySelector(".text-gain")).toBeNull();
    expect(container.querySelector(".text-loss")).toBeNull();
  });

  it("reads the sign of a rate a float would round away", () => {
    const { container } = render(
      <SignedPercent value="0.0000000001" locale="en-US" />,
    );

    expect(container.textContent).toMatch(/gain/i);
  });

  it("tones a gain and a loss differently, as confirmation of the sign", () => {
    const gain = render(<SignedPercent value="0.1" locale="en-US" />);
    expect(gain.container.querySelector(".text-gain")).not.toBeNull();

    const loss = render(<SignedPercent value="-0.1" locale="en-US" />);
    expect(loss.container.querySelector(".text-loss")).not.toBeNull();
  });
});
