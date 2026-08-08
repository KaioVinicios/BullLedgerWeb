import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MoneyField } from "@/forms/MoneyField";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <MoneyField
      name="amount"
      label="Amount"
      currency="BRL"
      errors={[]}
      value={value}
      onBlur={() => undefined}
      onChange={setValue}
    />
  );
}

function mount(initial?: string) {
  render(<Harness initial={initial} />);

  return screen.getByLabelText("Amount") as HTMLInputElement;
}

describe("MoneyField", () => {
  it("fills from the right as digits are typed", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "2");
    expect(input.value).toBe("0.02");

    await user.type(input, "0000");
    expect(input.value).toBe("200.00");
  });

  it("ignores a letter completely", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "12ab34");

    expect(input.value).toBe("12.34");
  });

  it("ignores a minus sign, because the wire applies the sign", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "-500");

    expect(input.value).toBe("5.00");
  });

  it("groups thousands as they appear", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "123456789");

    expect(input.value).toBe("1,234,567.89");
  });

  // Zero is not absence: AccountForm sends null for an empty contribution
  // room and { amount: 0 } for one that is fully used.
  it("keeps a typed zero", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "0");

    expect(input.value).toBe("0.00");
  });

  it("clears on backspace at zero rather than sticking", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "0");
    expect(input.value).toBe("0.00");

    await user.type(input, "{Backspace}");
    expect(input.value).toBe("");
  });

  it("shortens from the right on backspace", async () => {
    const user = userEvent.setup();
    const input = mount("200.00");

    await user.type(input, "{Backspace}");

    expect(input.value).toBe("20.00");
  });

  it("keeps the caret at the end, where the next digit lands", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "12345");

    expect(input.selectionStart).toBe(input.value.length);
  });

  /**
   * A pasted number is not a stream of keystrokes. Read as one, `1.5` becomes
   * `0.15` — the decimal point silently thrown away and the value divided by
   * ten, which in a ledger is the worst kind of wrong: plausible.
   */
  it("reads a pasted value as a number, not as digits", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.click(input);
    await user.paste("1.5");

    expect(input.value).toBe("1.50");
  });

  it("keeps a pasted value that already has both places", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.click(input);
    await user.paste("1,234.56");

    expect(input.value).toBe("1,234.56");
  });

  it("declares a decimal keypad for mobile", () => {
    expect(mount()).toHaveAttribute("inputmode", "decimal");
  });
});
