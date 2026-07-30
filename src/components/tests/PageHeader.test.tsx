import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/PageHeader";

describe("PageHeader", () => {
  it("renders the title as the page's only h1", () => {
    render(<PageHeader title="Accounts" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Accounts",
    );
  });

  it("renders the description and the action when given them", () => {
    render(
      <PageHeader
        title="Accounts"
        description="Where you hold what you hold."
        action={<button type="button">New account</button>}
      />,
    );

    expect(
      screen.getByText("Where you hold what you hold."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New account" }),
    ).toBeInTheDocument();
  });

  it("renders neither when they are omitted", () => {
    render(<PageHeader title="Accounts" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
