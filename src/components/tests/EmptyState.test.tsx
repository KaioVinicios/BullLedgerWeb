import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IconInbox } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("names the state and the next action", () => {
    render(
      <EmptyState
        icon={IconInbox}
        title="No accounts yet"
        description="Add the first one to start recording movements."
        action={<button type="button">New account</button>}
      />,
    );

    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New account" }),
    ).toBeInTheDocument();
  });

  it("renders without an action, for the states that genuinely have none", () => {
    render(
      <EmptyState
        icon={IconInbox}
        title="Nothing here yet"
        description="This area is still being built."
      />,
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides its icon from assistive technology", () => {
    const { container } = render(
      <EmptyState icon={IconInbox} title="Empty" description="Nothing." />,
    );

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
