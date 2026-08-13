import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import app from "@/i18n/locales/en/app.json";
import { ScopeField } from "@/pages/Targets/ScopeField";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";

const accounts: Account[] = [];
const assets: Asset[] = [];
const noop = () => undefined;

const base = {
  account: "",
  onAccountChange: noop,
  asset: "",
  onAssetChange: noop,
  archetype: "CRYPTO" as const,
  onArchetypeChange: noop,
  accounts,
  assets,
  errors: {},
};

describe("ScopeField", () => {
  it("explains each level beside its option rather than only naming it", () => {
    render(<ScopeField scope="HOLDING" onScopeChange={noop} {...base} />);

    expect(screen.getByText(app.targets.levelHint.HOLDING)).toBeVisible();
    expect(
      screen.getByText(app.targets.levelHint.PORTFOLIO_ARCHETYPE),
    ).toBeVisible();
  });

  // The hint is on the page for the eye either way; this is the other half —
  // it reaches a screen reader too, as the radio's description rather than as
  // part of its name, so the option is still announced as its own short label.
  it("gives each option's explanation to the radio that owns it", () => {
    render(<ScopeField scope="HOLDING" onScopeChange={noop} {...base} />);

    const holding = screen.getByRole("radio", {
      name: app.enums.targetScope.HOLDING,
    });

    expect(holding).toHaveAccessibleName(app.enums.targetScope.HOLDING);
    expect(holding).toHaveAccessibleDescription(app.targets.levelHint.HOLDING);
  });

  it("reveals the fields the chosen level needs, and no others", () => {
    const { rerender } = render(
      <ScopeField scope="PORTFOLIO_ARCHETYPE" onScopeChange={noop} {...base} />,
    );

    expect(screen.queryByLabelText(app.targets.form.account)).toBeNull();
    expect(screen.getByLabelText(app.targets.form.archetype)).toBeVisible();

    rerender(<ScopeField scope="HOLDING" onScopeChange={noop} {...base} />);

    expect(screen.getByLabelText(app.targets.form.account)).toBeVisible();
    expect(screen.getByLabelText(app.targets.form.asset)).toBeVisible();
    expect(screen.queryByLabelText(app.targets.form.archetype)).toBeNull();
  });

  it("reports the chosen level", async () => {
    const onScopeChange = vi.fn();

    render(
      <ScopeField scope="HOLDING" onScopeChange={onScopeChange} {...base} />,
    );

    await userEvent.click(
      screen.getByRole("radio", {
        // Exact, not a pattern compiled out of prose: the option's whole
        // accessible name is this enum label, and asserting that is what
        // proves the hint below it stayed out of the name.
        name: app.enums.targetScope.PORTFOLIO_ARCHETYPE,
      }),
    );

    expect(onScopeChange).toHaveBeenCalledWith("PORTFOLIO_ARCHETYPE");
  });

  // "NAV fund" is a category name; "funds priced by net asset value" is what
  // it means, and the reader needs that while comparing options — so the gloss
  // lives in the open list, scoped to it. Only the list half is assertable
  // here: the closed trigger drops the gloss through a CSS rule, and jsdom
  // loads no stylesheet.
  it("glosses each archetype with an example inside the open list", async () => {
    render(
      <ScopeField scope="ACCOUNT_ARCHETYPE" onScopeChange={noop} {...base} />,
    );

    await userEvent.click(
      screen.getByRole("combobox", { name: app.targets.form.archetype }),
    );

    // Scoped to the list, so the trigger's own echo of the chosen item cannot
    // satisfy any of this.
    const list = within(screen.getByRole("listbox"));

    expect(list.getByText(app.enums.archetype.NAV_FUND)).toBeVisible();
    expect(
      list.getByText(app.targets.form.archetypeGloss.NAV_FUND),
    ).toBeVisible();
    expect(
      list.getByText(app.targets.form.archetypeGloss.CASH_DEPOSIT),
    ).toBeVisible();
  });

  // First render of a fresh account: the lists arrive empty, and an empty
  // select with no explanation says nothing about why it has nothing.
  it("says why an empty list is empty rather than offering a blank select", () => {
    render(<ScopeField scope="HOLDING" onScopeChange={noop} {...base} />);

    expect(
      screen.getByRole("combobox", { name: app.targets.form.account }),
    ).toHaveAccessibleDescription(app.targets.form.noAccounts);
    expect(
      screen.getByRole("combobox", { name: app.targets.form.asset }),
    ).toHaveAccessibleDescription(app.targets.form.noAssets);
  });
});
