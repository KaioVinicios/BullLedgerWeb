import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "@/i18n/config";
import { DecimalField } from "@/forms/DecimalField";
import { SCALE } from "@/utils/decimal";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <DecimalField
      name="quantity"
      label="Quantity"
      scale={SCALE.quantity}
      errors={[]}
      value={value}
      onBlur={() => undefined}
      onChange={setValue}
    />
  );
}

function mount(initial?: string) {
  render(<Harness initial={initial} />);

  return screen.getByLabelText("Quantity") as HTMLInputElement;
}

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("DecimalField", () => {
  it("types left to right, unlike the money mask", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "10");

    expect(input.value).toBe("10");
  });

  it("ignores letters", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1a0b");

    expect(input.value).toBe("10");
  });

  it("keeps precision the schema allows", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "0.000000000000000123");

    expect(input.value).toBe("0.000000000000000123");
  });

  it("groups thousands while typing", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1000000");

    expect(input.value).toBe("1,000,000");
  });

  it("keeps only the first decimal separator", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1.2.3");

    expect(input.value).toBe("1.23");
  });

  // The caret case the live-grouping decision was taken knowing about: a
  // separator appearing must not push the caret off the digit being typed.
  it("leaves the caret after the same digit when a separator appears", async () => {
    const user = userEvent.setup();
    const input = mount();

    await user.type(input, "1234");

    expect(input.value).toBe("1,234");
    expect(input.selectionStart).toBe(5);
  });

  it("keeps the caret in place when editing mid-number", async () => {
    const user = userEvent.setup();
    const input = mount("1,234,567");

    // Focus before positioning: an unfocused input takes no keystrokes, and
    // `setSelectionRange` alone does not focus.
    await user.click(input);
    input.setSelectionRange(3, 3); // 1,2|34,567 — two digits in
    await user.keyboard("9");

    // 1,293,4567 → regrouped as 12,934,567, caret still after the third digit.
    expect(input.value).toBe("12,934,567");
    expect(input.selectionStart).toBe(4);
  });

  // A rejected keystroke leaves the value identical, so React never re-renders
  // and instead restores the controlled value straight onto the element —
  // which drops the caret at the end. Typing a letter in the middle of a number
  // would send the cursor to the far side of it.
  it("leaves the caret alone when a keystroke is rejected", async () => {
    const user = userEvent.setup();
    const input = mount("1,234,567");

    await user.click(input);
    input.setSelectionRange(3, 3);
    await user.keyboard("a");

    expect(input.value).toBe("1,234,567");
    expect(input.selectionStart).toBe(3);
  });

  it("declares a decimal keypad for mobile", () => {
    expect(mount()).toHaveAttribute("inputmode", "decimal");
  });

  describe("in pt-BR", () => {
    it("accepts the Android keypad's dot as a decimal comma", async () => {
      await i18n.changeLanguage("pt");
      const user = userEvent.setup();
      const input = mount();

      await user.type(input, "19.40");

      expect(input.value).toBe("19,40");
    });

    it("groups with dots", async () => {
      await i18n.changeLanguage("pt");
      const user = userEvent.setup();
      const input = mount();

      await user.type(input, "1000000");

      expect(input.value).toBe("1.000.000");
    });
  });
});
