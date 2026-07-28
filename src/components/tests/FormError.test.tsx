import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FormError } from "@/components/FormError";

describe("FormError", () => {
  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<FormError errors={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("announces the problem to assistive technology", () => {
    render(
      <FormError errors={["Unable to log in with provided credentials."]} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to log in with provided credentials.",
    );
  });

  it("shows every message, not just the first", () => {
    render(<FormError errors={["First problem.", "Second problem."]} />);

    expect(screen.getByText("First problem.")).toBeInTheDocument();
    expect(screen.getByText("Second problem.")).toBeInTheDocument();
  });
});
