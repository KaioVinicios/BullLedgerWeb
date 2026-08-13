import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import app from "@/i18n/locales/en/app.json";
import { FloorField } from "@/pages/Targets/FloorField";

const noop = () => undefined;

describe("FloorField", () => {
  it("hides the inputs until the switch is on", () => {
    render(
      <FloorField
        enabled={false}
        onEnabledChange={noop}
        pct="3"
        onPctChange={noop}
        period="MONTHLY"
        onPeriodChange={noop}
        errors={[]}
      />,
    );

    // The positive anchor: the switch is what an off floor still offers, so
    // finding it proves the absences below are absences from a real render.
    expect(
      screen.getByRole("switch", { name: app.targets.form.floor.toggle }),
    ).toBeInTheDocument();

    expect(screen.queryByLabelText(app.targets.form.floor.rate)).toBeNull();
    expect(screen.queryByLabelText(app.targets.form.floor.period)).toBeNull();
  });

  it("turns on through the switch", async () => {
    const onEnabledChange = vi.fn();

    render(
      <FloorField
        enabled={false}
        onEnabledChange={onEnabledChange}
        pct=""
        onPctChange={noop}
        period="MONTHLY"
        onPeriodChange={noop}
        errors={[]}
      />,
    );

    await userEvent.click(
      screen.getByRole("switch", { name: app.targets.form.floor.toggle }),
    );

    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  // The visible − is decorative, so the sign has to reach a screen reader some
  // other way. The hint is `aria-describedby` on the input, and it carries it.
  it("states the signed threshold in the field's hint", () => {
    render(
      <FloorField
        enabled
        onEnabledChange={noop}
        pct="3"
        onPctChange={noop}
        period="MONTHLY"
        onPeriodChange={noop}
        errors={[]}
      />,
    );

    expect(
      screen.getByLabelText(app.targets.form.floor.rate),
    ).toHaveAccessibleDescription(
      app.targets.form.floor.hint.replace("{{rate}}", "−3% monthly"),
    );
  });

  // The other half of that bargain: the − is on the page for the eye, and the
  // input's own accessible name says nothing about a sign the value does not
  // contain.
  it("prints the sign without announcing it", () => {
    render(
      <FloorField
        enabled
        onEnabledChange={noop}
        pct="3"
        onPctChange={noop}
        period="MONTHLY"
        onPeriodChange={noop}
        errors={[]}
      />,
    );

    const input = screen.getByLabelText(app.targets.form.floor.rate);

    // Scoped to the input's own wrapper, so a − printed anywhere else on the
    // field could not satisfy this.
    const sign = within(input.parentElement!).getByText("−");

    expect(sign).toHaveAttribute("aria-hidden", "true");
    expect(input).toHaveAccessibleName(app.targets.form.floor.rate);
  });

  it("asks for a value rather than describing an empty one", () => {
    render(
      <FloorField
        enabled
        onEnabledChange={noop}
        pct=""
        onPctChange={noop}
        period="MONTHLY"
        onPeriodChange={noop}
        errors={[]}
      />,
    );

    expect(
      screen.getByLabelText(app.targets.form.floor.rate),
    ).toHaveAccessibleDescription(app.targets.form.floor.hintEmpty);
  });
});
