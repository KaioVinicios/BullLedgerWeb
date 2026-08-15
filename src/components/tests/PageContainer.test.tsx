import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageContainer } from "@/components/PageContainer";

describe("PageContainer", () => {
  it("leaves a screen at the full content region by default", () => {
    render(
      <PageContainer>
        <p>figures</p>
      </PageContainer>,
    );

    // A table screen must not inherit a cap it never asked for.
    expect(screen.getByText("figures").parentElement?.className).not.toMatch(
      /max-w-/,
    );
  });

  it("gives a form its own measure", () => {
    render(
      <PageContainer width="form">
        <p>fields</p>
      </PageContainer>,
    );

    expect(screen.getByText("fields").parentElement).toHaveClass("max-w-3xl");
  });

  it("gives a form that reads beside something more room than the form measure", () => {
    render(
      <PageContainer width="form-wide">
        <p>fields and a summary</p>
      </PageContainer>,
    );

    // The target form puts a live summary panel next to its fields. Pinned to
    // the token rather than to "wider than form", because the point of this
    // module is that the number lives in one place.
    expect(screen.getByText("fields and a summary").parentElement).toHaveClass(
      "max-w-5xl",
    );
  });

  it("centres a capped column", () => {
    render(
      <PageContainer width="form">
        <p>fields</p>
      </PageContainer>,
    );

    // Heading and fields travel together, and the leftover room reads as
    // framing on both sides rather than a void down the right.
    expect(screen.getByText("fields").parentElement).toHaveClass("mx-auto");
  });

  it("gives a full-width screen no column to centre", () => {
    render(
      <PageContainer>
        <p>figures</p>
      </PageContainer>,
    );

    // Nothing is narrower than the region, so centring would be a no-op class
    // claiming a decision the screen never made.
    expect(screen.getByText("figures").parentElement?.className).not.toMatch(
      /\bmx-auto\b/,
    );
  });
});
