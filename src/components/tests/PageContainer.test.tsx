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

  it("does not centre the column", () => {
    render(
      <PageContainer width="form">
        <p>fields</p>
      </PageContainer>,
    );

    // The left edge stays put across navigations. Centring would move it
    // whenever a narrow screen follows a wide one.
    expect(screen.getByText("fields").parentElement?.className).not.toMatch(
      /\bmx-auto\b/,
    );
  });
});
