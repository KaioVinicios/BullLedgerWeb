import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import app from "@/i18n/locales/en/app.json";
import { ResolutionExplainer } from "@/pages/Targets/ResolutionExplainer";

describe("ResolutionExplainer", () => {
  it("states the rule and lists the levels in resolution order", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 4, ACCOUNT_ARCHETYPE: 2, PORTFOLIO_ARCHETYPE: 5 }}
        linked
      />,
    );

    // The heading names the region, which is the whole point of the
    // `aria-labelledby` → `<h2 id>` wiring: a `<section>` is only a landmark
    // once it has an accessible name, so this fails if either half is dropped.
    expect(
      screen.getByRole("region", { name: app.targets.resolution.title }),
    ).toBeInTheDocument();
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
        counts={{ HOLDING: 4, ACCOUNT_ARCHETYPE: 7, PORTFOLIO_ARCHETYPE: 5 }}
        linked
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    // Counts chosen so none can be confused with its own ordinal, and queried
    // as their own element rather than as substrings of the row: `2` in row
    // two would have matched the ordinal alone, and passed with the count cell
    // deleted entirely.
    expect(within(items[0]).getByText("4")).toBeInTheDocument();
    expect(within(items[1]).getByText("7")).toBeInTheDocument();
    expect(within(items[2]).getByText("5")).toBeInTheDocument();
  });

  it("gives every count a unit in text, not just a column position", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 4, ACCOUNT_ARCHETYPE: 1, PORTFOLIO_ARCHETYPE: 0 }}
        linked
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    // Sighted readers get "these are one series, one per level" from a
    // right-aligned column of tabular figures. That relationship is pure
    // presentation, so WCAG 1.3.1 requires it in text too — and the bare digit
    // is hidden from the accessibility tree so it is not announced twice.
    expect(
      within(items[0]).getByText(
        app.targets.resolution.count_other.replace("{{count}}", "4"),
      ),
    ).toBeInTheDocument();
    expect(within(items[0]).getByText("4")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    // Singular and zero are their own strings: "1 targets" and "0 targets"
    // are both wrong, and zero is the one a plural rule silently gets last.
    expect(
      within(items[1]).getByText(
        app.targets.resolution.count_one.replace("{{count}}", "1"),
      ),
    ).toBeInTheDocument();
    expect(
      within(items[2]).getByText(app.targets.resolution.count_zero),
    ).toBeInTheDocument();
  });

  it("shows an em dash instead of a count while the load is in flight", () => {
    render(
      <ResolutionExplainer
        counts={{
          HOLDING: null,
          ACCOUNT_ARCHETYPE: null,
          PORTFOLIO_ARCHETYPE: null,
        }}
        linked
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
        linked
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    // A level with no targets is a fact the screen knows; a load still in
    // flight and a load that failed are both the screen not knowing. This is
    // the difference between `count === null` and any falsy check, and it is
    // the kind of thing a later refactor flips without noticing.
    expect(within(items[1]).getByText("0")).toBeInTheDocument();
    expect(items[1]).not.toHaveTextContent("—");
  });

  it("links each level to its section", () => {
    render(
      <ResolutionExplainer
        counts={{ HOLDING: 1, ACCOUNT_ARCHETYPE: 0, PORTFOLIO_ARCHETYPE: 0 }}
        linked
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

  // The list page replaces all three sections with an error or an empty state
  // and keeps the explainer, so on those two screens the anchors would point
  // at ids that do not exist — navigation that looks live and goes nowhere.
  it("names the levels without linking when there are no sections to reach", () => {
    render(
      <ResolutionExplainer
        counts={{
          HOLDING: null,
          ACCOUNT_ARCHETYPE: null,
          PORTFOLIO_ARCHETYPE: null,
        }}
        linked={false}
      />,
    );

    // The lesson is still on screen — dropping the anchors must not drop the
    // levels with them.
    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent(app.enums.targetScope.HOLDING);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
