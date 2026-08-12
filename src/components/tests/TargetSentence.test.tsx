import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TargetSentence } from "@/components/TargetSentence";
import app from "@/i18n/locales/en/app.json";
import type { TargetClauses } from "@/utils/targetSentence";

const clauses: TargetClauses = {
  scope: "This target covers BTC in Binance.",
  steps: [
    {
      rate: "3% monthly",
      when: "for the first 3 months",
      text: "3% monthly for the first 3 months",
    },
    {
      rate: "2% monthly",
      when: "from month 3 onwards",
      text: "2% monthly from month 3 onwards",
    },
  ],
  floor: { rate: "−3% monthly", text: "a floor of −3% monthly" },
};

describe("TargetSentence", () => {
  it("reads as one line, with no scope, when laid out as a line", () => {
    render(<TargetSentence clauses={clauses} layout="line" />);

    expect(
      screen.getByText(
        "3% monthly for the first 3 months · 2% monthly from month 3 onwards · a floor of −3% monthly",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/covers BTC/)).toBeNull();
  });

  it("splits figure from qualifier when stacked", () => {
    render(<TargetSentence clauses={clauses} layout="stacked" />);

    expect(
      screen.getByText("This target covers BTC in Binance."),
    ).toBeVisible();
    expect(screen.getByText("3% monthly")).toBeVisible();
    expect(screen.getByText("for the first 3 months")).toBeVisible();
    expect(screen.getByText("−3% monthly")).toBeVisible();
  });

  it("renders no floor row when there is no floor", () => {
    render(
      <TargetSentence clauses={{ ...clauses, floor: null }} layout="stacked" />,
    );

    expect(screen.queryByText(/−/)).toBeNull();
  });

  it("still states a floor typed before the ladder was", () => {
    // A draft panel that swallowed a figure the user had already entered would
    // be reporting less than it knows — `PRODUCT.md`'s fourth principle. The
    // ladder is what is missing; the floor is not.
    render(
      <TargetSentence clauses={{ ...clauses, steps: [] }} layout="stacked" />,
    );

    expect(screen.getByText(app.targets.sentence.ladderEmpty)).toBeVisible();
    expect(screen.getByText("−3% monthly")).toBeVisible();
    expect(screen.getByText(app.targets.sentence.floorLabel)).toBeVisible();
  });

  it("names the rows after the scope that introduces them", () => {
    // Reached by list or landmark navigation, an unnamed group announces
    // "3% monthly, for the first 3 months" and never says which target that
    // describes.
    render(<TargetSentence clauses={clauses} layout="stacked" />);

    expect(
      screen.getByRole("group", {
        name: "This target covers BTC in Binance.",
      }),
    ).toBeVisible();
  });

  it("gives each instance its own scope id, so two on one page do not collide", () => {
    render(
      <>
        <TargetSentence clauses={clauses} layout="stacked" />
        <TargetSentence
          clauses={{ ...clauses, scope: "This target covers ETH in Kraken." }}
          layout="stacked"
        />
      </>,
    );

    const names = screen
      .getAllByRole("group")
      .map((group) => group.getAttribute("aria-labelledby"));

    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(
      screen.getByRole("group", { name: "This target covers ETH in Kraken." }),
    ).toBeVisible();
  });
});
