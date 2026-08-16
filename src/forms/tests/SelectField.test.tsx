/**
 * The empty-list half of `SelectField`.
 *
 * A Radix select with no items still opens: it portals a panel one line tall
 * with nothing in it, floating over the trigger it came from. That is the
 * defect these tests pin — not a missing message, but a control that behaves
 * as though it has something to offer and then offers nothing.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import common from "@/i18n/locales/en/common.json";
import { SelectField } from "@/forms/SelectField";

const noop = () => undefined;

function mount(props: Partial<React.ComponentProps<typeof SelectField>> = {}) {
  render(
    <SelectField
      name="account"
      label="Account"
      value=""
      options={[]}
      renderOption={(option) => option}
      onChange={noop}
      {...props}
    />,
  );

  return screen.getByRole("combobox", { name: "Account" });
}

describe("SelectField with nothing to choose", () => {
  it("does not open a blank list", async () => {
    const trigger = mount();

    await userEvent.click(trigger);

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so where the value would be, rather than resting blank", () => {
    expect(mount()).toHaveTextContent(common.field.noOptions);
  });

  it("prefers the caller's own reason over the generic one", () => {
    expect(mount({ emptyLabel: "No account registered" })).toHaveTextContent(
      "No account registered",
    );
  });

  // The reason `SelectValue`'s own `placeholder` is not what carries this:
  // a placeholder shows only while the value is empty. A value left behind by
  // a row that has since been deleted is not empty, finds no item to echo, and
  // renders the trigger blank — the exact state this is meant to prevent.
  it("still says it with a value no surviving option matches", () => {
    expect(mount({ value: "deleted-account-id" })).toHaveTextContent(
      common.field.noOptions,
    );
  });

  // Disabling the trigger takes it out of the tab order, so the hint is the
  // only thing left carrying *why* — it has to stay wired to the control.
  it("keeps the hint describing the field", () => {
    expect(
      mount({ hint: "Add an account first." }),
    ).toHaveAccessibleDescription("Add an account first.");
  });

  it("opens as usual once there is something to choose", async () => {
    const trigger = mount({ options: ["BRL", "USD"] });

    await userEvent.click(trigger);

    expect(screen.getByRole("listbox")).toBeVisible();
    expect(screen.getByRole("option", { name: "BRL" })).toBeVisible();
  });
});
