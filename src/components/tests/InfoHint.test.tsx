import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InfoHint } from "@/components/InfoHint";
import type { ExplainMetric } from "@/i18n/explain";
import en from "@/i18n/locales/en/explain.json";

const REAL_RETURN = en.portfolio.real_return;

describe("InfoHint", () => {
  it("names the metric it explains, so the trigger is not a bare 'info'", () => {
    // The label is lowercased into the sentence: "What is real return?", not
    // "What is Real return?" — elsewhere the label is a heading, but here it
    // is a noun phrase inside a question.
    render(<InfoHint metric="portfolio.real_return" />);

    expect(
      screen.getByRole("button", {
        name: `What is ${REAL_RETURN.label.toLocaleLowerCase()}?`,
      }),
    ).toBeInTheDocument();
  });

  it("shows the explainer when opened", async () => {
    const user = userEvent.setup();
    render(<InfoHint metric="portfolio.real_return" />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText(REAL_RETURN.body)).toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<InfoHint metric="portfolio.real_return" />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(await screen.findByText(REAL_RETURN.body)).toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to its trigger", async () => {
    const user = userEvent.setup();
    render(<InfoHint metric="portfolio.real_return" />);
    const trigger = screen.getByRole("button");

    await user.click(trigger);
    await screen.findByText(REAL_RETURN.body);
    await user.keyboard("{Escape}");

    expect(screen.queryByText(REAL_RETURN.body)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders nothing at all for a key with no entry", () => {
    // A trigger that opens onto blankness is worse than no trigger: it
    // promises an explanation the product does not have.
    const { container } = render(
      // Cast on purpose: the type cannot reach a key assembled from data, nor
      // one that exists in `en` and not in `pt`. This is the runtime net
      // under both, so the test has to hand it something the type forbids.
      <InfoHint metric={"portfolio.not_a_metric" as ExplainMetric} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
