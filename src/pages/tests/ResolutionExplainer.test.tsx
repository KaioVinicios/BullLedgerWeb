import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import app from "@/i18n/locales/en/app.json";
import { ResolutionExplainer } from "@/pages/Targets/ResolutionExplainer";

describe("ResolutionExplainer", () => {
  it("states the rule and lists the levels in resolution order", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 4, ACCOUNT_ARCHETYPE: 2, PORTFOLIO_ARCHETYPE: 5 }}
      />,
    );

    expect(screen.getByText(app.targets.resolution.rule)).toBeVisible();

    // The order is the rule, so it is carried by a real ordered list rather
    // than by a drawn bracket a screen reader would skip.
    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(app.enums.targetScope.HOLDING);
    expect(items[2]).toHaveTextContent(
      app.enums.targetScope.PORTFOLIO_ARCHETYPE,
    );
  });

  it("shows each level's count", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 4, ACCOUNT_ARCHETYPE: 2, PORTFOLIO_ARCHETYPE: 5 }}
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("4");
    expect(items[1]).toHaveTextContent("2");
  });

  it("shows an em dash instead of a count while the load is in flight", () => {
    render(
      <ResolutionExplainer
        counts={{
          HOLDING: null,
          ACCOUNT_ARCHETYPE: null,
          PORTFOLIO_ARCHETYPE: null,
        }}
      />,
    );

    // The rule first: every other assertion here counts dashes, and three
    // dashes would also be zero dashes short of a component that rendered
    // nothing else at all.
    expect(screen.getByText(app.targets.resolution.rule)).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("shows a real zero rather than the in-flight dash", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 1, ACCOUNT_ARCHETYPE: 0, PORTFOLIO_ARCHETYPE: 0 }}
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    // A level with no targets is a fact the screen knows; only the pending
    // load is unknown. This is the difference between `??` and `||`, and it is
    // the kind of thing a later refactor flips without noticing.
    expect(items[1]).toHaveTextContent("0");
    expect(items[1]).not.toHaveTextContent("—");
  });

  it("links each level to its section", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 1, ACCOUNT_ARCHETYPE: 0, PORTFOLIO_ARCHETYPE: 0 }}
      />,
    );

    // An exact accessible name rather than `new RegExp(copy)`: the pattern
    // would be compiled from translated prose, and the day that string gains a
    // `(`, `+` or `.` it silently stops meaning what it reads as. It also
    // pins the count *outside* the link, where it cannot pad the link's name.
    expect(
      screen.getByRole("link", { name: app.enums.targetScope.HOLDING }),
    ).toHaveAttribute("href", "#targets-HOLDING");
  });
});
