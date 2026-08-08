import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IntegerField } from "@/forms/IntegerField";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <IntegerField
      name="decimals"
      label="Decimals"
      errors={[]}
      value={value}
      onBlur={() => undefined}
      onChange={setValue}
    />
  );
}

function mount(initial?: string) {
  render(<Harness initial={initial} />);

  return screen.getByLabelText("Decimals") as HTMLInputElement;
}

describe("IntegerField", () => {
  it("takes digits", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "18");

    expect(input.value).toBe("18");
  });

  it("ignores letters", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1a8b");

    expect(input.value).toBe("18");
  });

  it("refuses a decimal separator, which is what makes it an integer", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1.8");

    expect(input.value).toBe("18");
  });

  it("groups thousands", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "120000");

    expect(input.value).toBe("120,000");
  });

  it("declares a numeric keypad, not a decimal one", () => {
    expect(mount()).toHaveAttribute("inputmode", "numeric");
  });
});
