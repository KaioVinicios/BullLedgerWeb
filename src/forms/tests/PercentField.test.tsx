import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PercentField } from "@/forms/PercentField";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <PercentField
      name="coupon_rate"
      label="Coupon rate"
      errors={[]}
      value={value}
      onBlur={() => undefined}
      onChange={setValue}
    />
  );
}

function mount(initial?: string) {
  render(<Harness initial={initial} />);

  return screen.getByLabelText("Coupon rate") as HTMLInputElement;
}

describe("PercentField", () => {
  it("fills from the right, two places like money", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1375");

    expect(input.value).toBe("13.75");
  });

  it("ignores a letter", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1a3b75");

    expect(input.value).toBe("13.75");
  });

  /**
   * The escape hatch. Every percent-backed field is
   * `^-?\d{0,4}(?:\.\d{0,8})?$` on the wire, which permits six decimal places
   * as a percent — more than the accumulator can express. Opening such a record
   * must not round it away, so that instance types freely instead.
   */
  it("drops out of accumulator mode when handed more precision than it can express", async () => {
    const user = userEvent.setup();
    const input = mount("13.755");

    expect(input.value).toBe("13.755");

    await user.type(input, "5");
    expect(input.value).toBe("13.7555");
  });

  it("still accumulates when its initial value fits in two places", async () => {
    const user = userEvent.setup();
    const input = mount("13.75");

    await user.type(input, "5");

    expect(input.value).toBe("137.55");
  });

  it("decides the mode once, so a fresh field never changes under the cursor", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1375");
    expect(input.value).toBe("13.75");

    await user.type(input, "5");
    expect(input.value).toBe("137.55");
  });

  it("declares a decimal keypad for mobile", () => {
    expect(mount()).toHaveAttribute("inputmode", "decimal");
  });
});
